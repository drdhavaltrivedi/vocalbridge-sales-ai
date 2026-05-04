import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import twilio from "twilio";
import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity, type Session, type LiveServerMessage } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { load as cheerioLoad } from "cheerio";
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

interface KnowledgeDoc {
  title: string;
  content: string;
  category?: string;
}

interface CallSession {
  callId: string;
  callSid: string;
  clientName: string;
  clientPhone: string;
  agentName: string;
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

// ── System instruction builder ─────────────────────────────────────────────────

function buildSystemInstruction(params: {
  agentName: string;
  clientName: string;
  tone?: string;
  speechPatterns?: string;
  focusAreas?: string[];
  baseInstruction?: string;
  clientInfo?: string;
  clientTags?: string[];
  knowledgeBase?: KnowledgeDoc[];
}): string {
  const {
    agentName, clientName, tone, speechPatterns,
    focusAreas, baseInstruction, clientInfo, clientTags, knowledgeBase,
  } = params;

  const sections: string[] = [];

  // Identity
  sections.push(
    baseInstruction?.trim() ||
    `You are ${agentName}, a highly skilled, empathetic, and persuasive Sales Professional making an outbound call.`
  );

  // Voice & style
  const styleLines: string[] = [];
  if (tone)           styleLines.push(`Tone: ${tone}`);
  if (speechPatterns) styleLines.push(`Speech style: ${speechPatterns}`);
  if (styleLines.length) sections.push(`VOICE & STYLE:\n${styleLines.join("\n")}`);

  // Focus areas
  if (focusAreas?.length) {
    sections.push(`KEY FOCUS AREAS:\n${focusAreas.map(f => `• ${f}`).join("\n")}`);
  }

  // Knowledge base — the most important context
  if (knowledgeBase?.length) {
    const grouped: Record<string, KnowledgeDoc[]> = {};
    for (const doc of knowledgeBase) {
      const cat = doc.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(doc);
    }
    const kbLines = Object.entries(grouped).map(([cat, docs]) =>
      `### ${cat}\n` + docs.map(d => `**${d.title}**\n${d.content}`).join("\n\n")
    ).join("\n\n");
    sections.push(`PRODUCT & COMPANY KNOWLEDGE BASE\nUse this to answer questions and handle objections accurately:\n\n${kbLines}`);
  }

  // Lead context
  const leadLines = [`You are calling: ${clientName}`];
  if (clientInfo)        leadLines.push(`Background on this lead: ${clientInfo}`);
  if (clientTags?.length) leadLines.push(`Their interests / tags: ${clientTags.join(", ")}`);
  sections.push(`LEAD CONTEXT:\n${leadLines.join("\n")}`);

  // Core conversation rules — critical for continuous dialogue
  sections.push(`CONVERSATION RULES — FOLLOW THESE EXACTLY:

1. THIS IS A LIVE PHONE CALL. Speak naturally. Use short sentences. Never write paragraphs.
2. ALWAYS respond to what the customer says — never go silent mid-conversation.
3. Keep each response to 2–4 sentences maximum. You're on a call, not writing an email.
4. NEVER reveal you are an AI. If asked directly, say: "I'm a senior account manager here."
5. ACTIVE LISTENING: Reference something the customer just said before making your next point.
6. DRIVE the conversation forward — don't wait passively. Ask follow-up questions.
7. OBJECTION — Price too high: "I understand. Many of our clients said the same — until they saw the ROI. Can I share what a similar company saved in the first 90 days?"
8. OBJECTION — Not interested: "That's fair — what would need to change for this to be relevant to you?"
9. OBJECTION — Too busy: "Absolutely, I respect your time. Could I reach you on [day] at [time]?"
10. OBJECTION — Already have a solution: "Great to hear! What's the biggest pain point you still have with it?"
11. CLOSING: When the call is going well, transition: "When would work for a quick 20-minute demo — later this week or early next?"
12. NATURAL PAUSES: After asking a question, stop speaking and wait for the response.
13. KEEP GOING: Never end the conversation unless the customer explicitly asks to hang up or you have secured a clear next step.`);

  return sections.join("\n\n");
}

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

  // ── Scrape URL for Knowledge Base ────────────────────────────────
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: "url is required" });

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VocalBridge-KB/1.0; +https://vocalbridge.ai)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        throw new Error("URL does not point to an HTML or text page");
      }

      const html = await response.text();
      const $    = cheerioLoad(html);

      // Strip chrome — scripts, styles, navigation, ads
      $("script, style, nav, header, footer, aside, iframe, noscript, svg").remove();
      $("[role='navigation'], [role='banner'], [role='complementary']").remove();
      $(".nav, .navbar, .footer, .sidebar, .menu, .cookie, .ad, .advertisement").remove();

      const pageTitle = $("title").first().text().trim() || new URL(url).hostname;

      // Prefer semantic main content containers when available
      const mainEl   = $("main, article, [role='main'], .content, .post, .entry-content").first();
      const rawText  = (mainEl.length ? mainEl : $("body"))
        .text()
        .replace(/[ \t]+/g, " ")      // collapse horizontal whitespace
        .replace(/\n{3,}/g, "\n\n")   // collapse excessive newlines
        .trim()
        .slice(0, 20000);              // cap for Gemini context window

      if (!rawText) throw new Error("No readable text content found on the page");

      console.log(`[Scrape] ${url} → ${rawText.length} chars, title="${pageTitle}"`);
      res.json({ title: pageTitle, text: rawText });
    } catch (err: any) {
      console.error("[Scrape] Failed:", url, err.message);
      res.status(500).json({ error: err.message ?? "Failed to scrape URL" });
    }
  });

  // ── Initiate outbound call ────────────────────────────────────────
  app.post("/api/calls/initiate", async (req, res) => {
    const {
      clientName,
      phoneNumber,
      voiceName        = "Kore",
      agentName        = "Alex",
      tone,
      speechPatterns,
      focusAreas       = [],
      systemInstruction,
      clientInfo,
      clientTags       = [],
      knowledgeBase    = [],
    } = req.body as {
      clientName: string;
      phoneNumber: string;
      clientInfo?: string;
      clientTags?: string[];
      voiceName?: string;
      agentName?: string;
      tone?: string;
      speechPatterns?: string;
      focusAreas?: string[];
      systemInstruction?: string;
      knowledgeBase?: KnowledgeDoc[];
    };

    if (!phoneNumber) {
      return res.status(400).json({ error: "phoneNumber is required" });
    }
    if (!process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER === "+1XXXXXXXXXX") {
      return res.status(400).json({ error: "TWILIO_PHONE_NUMBER not configured in .env" });
    }

    const callId = randomUUID();

    const fullInstruction = buildSystemInstruction({
      agentName,
      clientName,
      tone,
      speechPatterns,
      focusAreas,
      baseInstruction: systemInstruction,
      clientInfo,
      clientTags,
      knowledgeBase,
    });

    try {
      const twimlUrl = `${PUBLIC_URL}/api/voice/twiml?callId=${callId}`;
      const call = await twilioClient.calls.create({
        to:                   phoneNumber,
        from:                 process.env.TWILIO_PHONE_NUMBER!,
        url:                  twimlUrl,
        statusCallback:       `${PUBLIC_URL}/api/voice/status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent:  ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
        machineDetection:     "Enable",
      });

      const session: CallSession = {
        callId,
        callSid:          call.sid,
        clientName,
        clientPhone:      phoneNumber,
        agentName,
        history:          [],
        voiceName,
        systemInstruction: fullInstruction,
        status:           "initiated",
      };
      activeCalls.set(callId, session);
      callsBySid.set(call.sid, callId);

      console.log(`[Call] Initiated callId=${callId} callSid=${call.sid} to=${phoneNumber} kb_docs=${knowledgeBase.length}`);
      res.json({ callId, callSid: call.sid, status: "initiated" });
    } catch (err: any) {
      console.error("[Call] Initiation failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── TwiML: connect MediaStream when lead answers ──────────────────
  // Twilio fetches this URL when the lead picks up. AnsweredBy is included
  // in the request body when machineDetection: "Enable" is set.
  app.all("/api/voice/twiml", (req, res) => {
    const params     = { ...req.query, ...req.body } as Record<string, string>;
    const callId     = params.callId;
    const answeredBy = params.AnsweredBy ?? "";
    const twiml      = new twilio.twiml.VoiceResponse();
    const session    = activeCalls.get(callId);

    if (!session) {
      twiml.say("I apologize, this call could not be connected. Goodbye.");
      twiml.hangup();
    } else if (answeredBy && answeredBy !== "human") {
      // Voicemail / answering machine detected — hang up immediately
      console.log(`[AMD] Machine detected (${answeredBy}) callId=${callId} client=${session.clientName}`);
      session.status = "completed";
      emitToFrontend(callId, {
        type:         "call_ended",
        twilioStatus: "machine_detected",
        transcript:   [],
      });
      twiml.hangup();
    } else {
      session.status = "active";
      const connect  = twiml.connect();
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
  const streamWss = new WebSocketServer({ noServer: true });

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
          // Keep VAD sensitivity balanced — responds quickly but doesn't cut off customer
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
              endOfSpeechSensitivity:   EndSensitivity.END_SENSITIVITY_LOW,
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.log(`[Gemini Live] Connected for callId=${callId}`);
            // Tell the agent to deliver its opening and then drive the conversation.
            // "turnComplete: false" keeps the session in an active listening/responding
            // loop rather than treating this as a single-shot exchange.
            liveSession!.sendClientContent({
              turns: [{
                role: "user",
                parts: [{
                  text: `The phone call just connected. ${session.clientName} has answered.

Deliver your warm opening greeting now as ${session.agentName}. Introduce yourself, briefly state why you're calling, and end with an open question to engage them.

After they respond, continue the conversation naturally — listen, acknowledge what they say, and keep driving toward your goal. Do NOT stop after the greeting. Keep talking and responding for the entire call.`,
                }],
              }],
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

  const frontendWss = new WebSocketServer({ noServer: true });

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

  // ── Handle HTTP Upgrades manually to support multiple WebSocket paths ──
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "/", "ws://localhost").pathname;

    if (pathname === "/ws/stream") {
      streamWss.handleUpgrade(request, socket as any, head, (ws) => {
        streamWss.emit("connection", ws, request);
      });
    } else if (pathname === "/ws/calls") {
      frontendWss.handleUpgrade(request, socket as any, head, (ws) => {
        frontendWss.emit("connection", ws, request);
      });
    }
    // For any other path (like Vite HMR in dev mode), we do nothing and let other listeners handle it.
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
