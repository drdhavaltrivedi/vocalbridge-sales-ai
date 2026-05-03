import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import twilio from "twilio";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Clients ────────────────────────────────────────────────────────────────────

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Types ──────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  role: "agent" | "customer";
  text: string;
  time: string;
}

interface CallSession {
  callId: string;
  callSid: string;
  clientName: string;
  clientPhone: string;
  history: TranscriptLine[];
  voiceName: string;
  systemInstruction: string;
  status: "initiated" | "active" | "completed" | "failed";
  liveSession?: Session;
}

// ── In-memory state ────────────────────────────────────────────────────────────

const activeCalls = new Map<string, CallSession>();
const callsBySid  = new Map<string, string>();
const frontendSockets = new Map<string, WebSocket>();

// ── Audio: G.711 μ-law ↔ PCM + resampling ─────────────────────────────────────

function ulawDecode(u: number): number {
  u = ~u & 0xFF;
  const sign = u & 0x80;
  const exp  = (u >> 4) & 0x07;
  const mant = u & 0x0F;
  let s = ((mant << 3) | 0x84) << exp;
  s -= 0x84;
  return sign ? -s : s;
}

function ulawEncode(sample: number): number {
  const BIAS = 0x84;
  sample = Math.max(-32767, Math.min(32767, sample));
  const sign = sample < 0 ? 0x80 : 0;
  if (sign) sample = -sample;
  sample += BIAS;
  let exp = 7;
  for (; exp > 0; exp--) if (sample & (1 << (exp + 3))) break;
  return (~(sign | (exp << 4) | ((sample >> (exp + 3)) & 0x0F))) & 0xFF;
}

// Simple linear interpolation resampler
function resampleLinear(src: Int16Array, srcRate: number, dstRate: number): Int16Array {
  if (srcRate === dstRate) return src;
  const ratio = srcRate / dstRate;
  const len   = Math.floor(src.length / ratio);
  const dst   = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * ratio;
    const lo  = Math.floor(pos);
    const hi  = Math.min(lo + 1, src.length - 1);
    dst[i]    = Math.round(src[lo] * (1 - (pos - lo)) + src[hi] * (pos - lo));
  }
  return dst;
}

// Twilio → Gemini: decode mulaw 8kHz → PCM base64 at 16kHz
function twilioToGemini(base64Ulaw: string): string {
  const raw   = Buffer.from(base64Ulaw, "base64");
  const pcm8k = new Int16Array(raw.length);
  for (let i = 0; i < raw.length; i++) pcm8k[i] = ulawDecode(raw[i]);
  const pcm16k = resampleLinear(pcm8k, 8000, 16000);
  const buf    = Buffer.alloc(pcm16k.length * 2);
  for (let i = 0; i < pcm16k.length; i++) buf.writeInt16LE(pcm16k[i], i * 2);
  return buf.toString("base64");
}

// Gemini → Twilio: decode PCM at srcRate → mulaw 8kHz base64
function geminiToTwilio(base64PCM: string, srcRate = 24000): string {
  const raw  = Buffer.from(base64PCM, "base64");
  const src  = new Int16Array(raw.length / 2);
  for (let i = 0; i < src.length; i++) src[i] = raw.readInt16LE(i * 2);
  const pcm8k = resampleLinear(src, srcRate, 8000);
  const ulaw  = Buffer.alloc(pcm8k.length);
  for (let i = 0; i < pcm8k.length; i++) ulaw[i] = ulawEncode(pcm8k[i]);
  return ulaw.toString("base64");
}

// ── WebSocket helpers ──────────────────────────────────────────────────────────

function emitToFrontend(callId: string, payload: Record<string, unknown>) {
  const ws = frontendSockets.get(callId);
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// ── Default system instruction ─────────────────────────────────────────────────

const DEFAULT_SYSTEM_INSTRUCTION = `You are a highly skilled, empathetic, and persuasive Sales Professional named Alex.
Your goal is to sell our technical products and services.

CORE RULES:
1. NEVER mention you are an AI. If asked, say you are a senior account manager.
2. Tone: Professional, warm, and rapport-building.
3. Handle objections with curiosity: "That's a valid concern — many clients felt the same until they saw the ROI."
4. If the customer is busy, suggest a specific callback time.
5. Be concise — 2 to 4 sentences per response. This is a phone call, not an email.
6. Goal: Secure a commitment, a demo booking, or a follow-up meeting.`;

// ── Main server ────────────────────────────────────────────────────────────────

async function startServer() {
  const app        = express();
  const httpServer = createServer(app);
  const PORT       = parseInt(process.env.PORT ?? "3000");
  const PUBLIC_URL = (process.env.PUBLIC_SERVER_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");

  // WebSocket URL for Twilio MediaStream (must be wss:// in production)
  const WS_URL = PUBLIC_URL.replace(/^https/, "wss").replace(/^http/, "ws");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ── Health ────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeCalls: activeCalls.size,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      gemini: !!process.env.GEMINI_API_KEY,
      publicUrl: PUBLIC_URL,
    });
  });

  // ── Initiate outbound call ────────────────────────────────────────
  app.post("/api/calls/initiate", async (req, res) => {
    const {
      clientName,
      phoneNumber,
      voiceName = "Kore",
      agentName = "Alex",
      systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
    } = req.body as {
      clientName: string;
      phoneNumber: string;
      voiceName?: string;
      agentName?: string;
      systemInstruction?: string;
    };

    if (!phoneNumber) {
      return res.status(400).json({ error: "phoneNumber is required" });
    }
    if (!process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER === "+1XXXXXXXXXX") {
      return res.status(400).json({ error: "TWILIO_PHONE_NUMBER not configured in .env" });
    }

    const callId = randomUUID();

    // Build system instruction with caller context
    const fullInstruction = `${systemInstruction}

You are calling ${clientName}. Your name is ${agentName}. When the call connects, greet them warmly and introduce yourself concisely.`;

    try {
      const twimlUrl = `${PUBLIC_URL}/api/voice/twiml?callId=${callId}`;
      const call = await twilioClient.calls.create({
        to:                     phoneNumber,
        from:                   process.env.TWILIO_PHONE_NUMBER!,
        url:                    twimlUrl,
        statusCallback:         `${PUBLIC_URL}/api/voice/status`,
        statusCallbackMethod:   "POST",
        statusCallbackEvent:    ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
      });

      const session: CallSession = {
        callId,
        callSid: call.sid,
        clientName,
        clientPhone: phoneNumber,
        history: [],
        voiceName,
        systemInstruction: fullInstruction,
        status: "initiated",
      };
      activeCalls.set(callId, session);
      callsBySid.set(call.sid, callId);

      console.log(`[Call] Initiated callId=${callId} callSid=${call.sid} to=${phoneNumber}`);
      res.json({ callId, callSid: call.sid, status: "initiated" });
    } catch (err: any) {
      console.error("[Call] Initiation failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── TwiML: connect MediaStream when lead answers ──────────────────
  // Twilio fetches this URL when the lead picks up. Returns a <Connect><Stream>
  // which opens a bidirectional audio WebSocket to /ws/stream.
  app.all("/api/voice/twiml", (req, res) => {
    const { callId } = { ...req.query, ...req.body } as Record<string, string>;
    const twiml   = new twilio.twiml.VoiceResponse();
    const session = activeCalls.get(callId);

    if (!session) {
      twiml.say("I apologize, this call could not be connected. Goodbye.");
      twiml.hangup();
    } else {
      session.status = "active";
      const connect = twiml.connect();
      // track: inbound_track → Twilio sends us only the customer's audio,
      // preventing Gemini's own voice from echoing back as input.
      connect.stream({
        url:   `${WS_URL}/ws/stream?callId=${callId}`,
        track: "inbound_track",
      });
      // Fallback: if the WebSocket closes before the call ends (e.g. Gemini error),
      // Twilio plays this and hangs up gracefully.
      twiml.say({ voice: "Polly.Joanna-Neural" }, "Thank you for your time. We will follow up soon. Goodbye.");
      twiml.hangup();
    }

    res.type("text/xml").send(twiml.toString());
  });

  // ── Twilio call status callback ───────────────────────────────────
  app.post("/api/voice/status", (req, res) => {
    const { CallSid, CallStatus } = req.body as { CallSid: string; CallStatus: string };
    const callId = callsBySid.get(CallSid);

    if (callId) {
      const session  = activeCalls.get(callId);
      const terminal = ["completed", "failed", "busy", "no-answer", "canceled"];
      if (session && terminal.includes(CallStatus)) {
        session.status = CallStatus === "completed" ? "completed" : "failed";

        // Close Gemini Live session if still open
        try { session.liveSession?.close(); } catch {}

        emitToFrontend(callId, {
          type:          "call_ended",
          twilioStatus:  CallStatus,
          transcript:    session.history,
        });

        // Clean up after 2 minutes
        setTimeout(() => {
          activeCalls.delete(callId);
          callsBySid.delete(CallSid);
        }, 120_000);
      }
      console.log(`[Status] callId=${callId} twilioStatus=${CallStatus}`);
    }
    res.sendStatus(204);
  });

  // ── End call manually from frontend ──────────────────────────────
  app.post("/api/calls/end/:callId", async (req, res) => {
    const session = activeCalls.get(req.params.callId);
    if (!session) return res.status(404).json({ error: "Call not found" });
    try {
      try { session.liveSession?.close(); } catch {}
      await twilioClient.calls(session.callSid).update({ status: "completed" });
      session.status = "completed";
      emitToFrontend(session.callId, { type: "call_ended", transcript: session.history });
      res.json({ success: true, transcript: session.history });
    } catch (err: any) {
      console.error("[End] Failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get live call transcript (polling fallback) ───────────────────
  app.get("/api/calls/:callId/transcript", (req, res) => {
    const session = activeCalls.get(req.params.callId);
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json({ transcript: session.history, status: session.status });
  });

  // ── WebSocket: Twilio MediaStream ↔ Gemini Live audio bridge ──────
  //
  // Flow:
  //   1. Lead answers → Twilio opens WS to /ws/stream?callId=xxx
  //   2. We connect a Gemini Live session and send the initial greeting prompt
  //   3. Twilio streams customer's voice (mulaw 8kHz) → we decode/resample → Gemini Live
  //   4. Gemini Live streams AI voice (PCM 24kHz) → we resample/encode → Twilio
  //   5. Gemini Live provides real-time transcription for both sides
  //
  const streamWss = new WebSocketServer({ server: httpServer, path: "/ws/stream" });

  streamWss.on("connection", async (ws, req) => {
    const url    = new URL(req.url ?? "/", "ws://localhost");
    const callId = url.searchParams.get("callId");
    if (!callId) { ws.close(4000, "callId required"); return; }

    const session = activeCalls.get(callId);
    if (!session) { ws.close(4001, "session not found"); return; }

    let streamSid    = "";
    let liveSession: Session | null = null;
    let isClosed     = false;

    function closeStream() {
      if (isClosed) return;
      isClosed = true;
      try { liveSession?.close(); } catch {}
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }

    // Connect Gemini Live session
    try {
      liveSession = await ai.live.connect({
        model: "gemini-2.0-flash-live-001",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: session.voiceName } },
          },
          systemInstruction: session.systemInstruction,
          inputAudioTranscription:  {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`[Gemini Live] Connected for callId=${callId}`);
            // Prompt the agent to speak its opening greeting
            liveSession!.sendClientContent({
              turns: [{ role: "user", parts: [{ text: `[The call just connected. Start with your opening greeting now.]` }] }],
              turnComplete: true,
            });
            emitToFrontend(callId, { type: "call_answered", callId });
          },

          onmessage: (msg: LiveServerMessage) => {
            const sc = msg.serverContent;
            if (!sc) return;

            // Interruption: customer spoke — clear Twilio's audio buffer
            if (sc.interrupted && ws.readyState === WebSocket.OPEN && streamSid) {
              ws.send(JSON.stringify({ event: "clear", streamSid }));
            }

            // Audio chunks from Gemini → convert and send to Twilio
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data && ws.readyState === WebSocket.OPEN && streamSid) {
                  const mimeType = part.inlineData.mimeType ?? "audio/pcm;rate=24000";
                  const rateMatch = mimeType.match(/rate=(\d+)/);
                  const srcRate   = rateMatch ? parseInt(rateMatch[1]) : 24000;
                  const payload   = geminiToTwilio(part.inlineData.data, srcRate);
                  ws.send(JSON.stringify({ event: "media", streamSid, media: { payload } }));
                }
              }
            }

            // Agent transcript (output)
            if (sc.outputTranscription?.text?.trim()) {
              const line: TranscriptLine = {
                role: "agent",
                text: sc.outputTranscription.text.trim(),
                time: new Date().toLocaleTimeString(),
              };
              session.history.push(line);
              emitToFrontend(callId, { type: "transcript", ...line });
            }

            // Customer transcript (input)
            if (sc.inputTranscription?.text?.trim()) {
              const line: TranscriptLine = {
                role: "customer",
                text: sc.inputTranscription.text.trim(),
                time: new Date().toLocaleTimeString(),
              };
              session.history.push(line);
              emitToFrontend(callId, { type: "transcript", ...line });
            }
          },

          onerror: (e: ErrorEvent) => {
            console.error(`[Gemini Live] Error for callId=${callId}:`, e.message ?? e);
            closeStream();
          },

          onclose: () => {
            console.log(`[Gemini Live] Session closed for callId=${callId}`);
          },
        },
      });

      session.liveSession = liveSession;
    } catch (err) {
      console.error("[Gemini Live] Connect failed:", err);
      ws.close(4002, "AI session failed");
      return;
    }

    // Handle Twilio MediaStream messages
    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          event: string;
          start?: { streamSid: string };
          media?: { payload: string };
        };

        switch (msg.event) {
          case "connected":
            console.log(`[Stream] WS connected for callId=${callId}`);
            break;

          case "start":
            streamSid = msg.start?.streamSid ?? "";
            console.log(`[Stream] Started streamSid=${streamSid} callId=${callId}`);
            break;

          case "media":
            // Forward customer audio to Gemini Live
            if (liveSession && msg.media?.payload && !isClosed) {
              const pcm16kBase64 = twilioToGemini(msg.media.payload);
              liveSession.sendRealtimeInput({
                audio: { data: pcm16kBase64, mimeType: "audio/pcm;rate=16000" },
              });
            }
            break;

          case "stop":
            console.log(`[Stream] Stopped for callId=${callId}`);
            closeStream();
            break;
        }
      } catch (err) {
        console.error("[Stream] Message error:", err);
      }
    });

    ws.on("close", () => {
      console.log(`[Stream] WS closed for callId=${callId}`);
      closeStream();
      if (session.status === "active") {
        session.status = "completed";
        emitToFrontend(callId, { type: "call_ended", transcript: session.history });
      }
    });
  });

  // ── WebSocket: frontend real-time transcript updates ──────────────
  const frontendWss = new WebSocketServer({ server: httpServer, path: "/ws/calls" });

  frontendWss.on("connection", (ws, req) => {
    const url    = new URL(req.url ?? "/", "ws://localhost");
    const callId = url.searchParams.get("callId");
    if (!callId) { ws.close(4000, "callId required"); return; }

    frontendSockets.set(callId, ws);
    console.log(`[WS] Frontend connected for callId=${callId}`);

    // Replay existing transcript
    const session = activeCalls.get(callId);
    if (session) {
      ws.send(JSON.stringify({ type: "connected", callId, status: session.status }));
      session.history.forEach(line =>
        ws.send(JSON.stringify({ type: "transcript", ...line }))
      );
    }

    ws.on("close", () => {
      if (frontendSockets.get(callId) === ws) frontendSockets.delete(callId);
      console.log(`[WS] Frontend disconnected for callId=${callId}`);
    });
  });

  // ── Vite middleware / static files ────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 VocalBridge server running on http://localhost:${PORT}`);
    console.log(`📞 Twilio webhooks via: ${PUBLIC_URL}`);
    console.log(`🔌 Gemini Live bridge: ${WS_URL}/ws/stream?callId=<id>`);
    console.log(`🖥  Frontend socket:    ${WS_URL}/ws/calls?callId=<id>\n`);
  });
}

startServer().catch(err => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
