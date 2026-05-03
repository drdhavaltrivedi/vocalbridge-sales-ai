import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Clients ────────────────────────────────────────────────────────────���───────

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
}

// ── In-memory state ────────────────────────────────────────────────────────────

const activeCalls = new Map<string, CallSession>();  // callId → session
const callsBySid = new Map<string, string>();         // twilioCallSid → callId
const audioCache = new Map<string, Buffer>();         // audioId → wav buffer
const frontendSockets = new Map<string, WebSocket>(); // callId → frontend ws

// ── Audio helpers ──────────────────────────────────────────────────────────────

async function generateTTS(text: string, voiceName: string): Promise<Buffer | null> {
  try {
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) return null;
    return Buffer.from(audioData, "base64");
  } catch (err) {
    console.error("[TTS] Gemini TTS failed, will fall back to Twilio Say:", (err as Error).message);
    return null;
  }
}

// ── AI response generation ─────────────────────────────────────────────────────

async function generateAgentResponse(session: CallSession, customerText: string): Promise<string> {
  const history = session.history
    .map(t => `${t.role === "agent" ? "Agent" : "Customer"}: ${t.text}`)
    .join("\n");

  const prompt = `${session.systemInstruction}

Current conversation:
${history || "(Call just connected)"}

Customer just said: "${customerText}"

Respond as the sales agent. Be concise (2–4 sentences). Sound natural and human.`;

  try {
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return (response.text as string)?.trim() ?? "That's a great point. Let me look into that for you.";
  } catch (err) {
    console.error("[AI] Response generation failed:", err);
    return "I appreciate that. Could you give me just a moment while I check that for you?";
  }
}

// ── WebSocket helpers ──────────────────────────────────────────────────────────

function emitToFrontend(callId: string, payload: Record<string, unknown>) {
  const ws = frontendSockets.get(callId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// ── System instruction (default) ───────────────────────────────────────────────

const DEFAULT_SYSTEM_INSTRUCTION = `You are a highly skilled, empathetic, and persuasive Sales Professional named Alex.
Your goal is to sell our technical products and services.

CORE RULES:
1. NEVER mention you are an AI. If asked, you are a senior account manager.
2. Tone: Professional, warm, and rapport-building.
3. Handle objections with curiosity: "That's a valid concern — many clients felt the same until they saw the ROI."
4. If the customer is busy, suggest a specific callback time.
5. Be concise — 2 to 4 sentences per response. Phone call, not email.
6. Goal: Secure a commitment, a demo booking, or a follow-up meeting.`;

// ── Main server ────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT ?? "3000");
  const PUBLIC_URL = (process.env.PUBLIC_SERVER_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ── Health ───────────────────────────���─────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeCalls: activeCalls.size,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      gemini: !!process.env.GEMINI_API_KEY,
      publicUrl: PUBLIC_URL,
    });
  });

  // ── Serve cached TTS audio ─────────────────────────────────────────

  app.get("/api/audio/:id", (req, res) => {
    const buf = audioCache.get(req.params.id);
    if (!buf) return res.status(404).end();
    res.set("Content-Type", "audio/wav");
    res.set("Cache-Control", "no-cache");
    res.send(buf);
  });

  // ── Initiate outbound call ─────────────────────────────────────────

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

    try {
      // Pre-generate opening greeting with Gemini TTS
      const greeting = `Hello, may I speak with ${clientName}? This is ${agentName} calling.`;
      const greetingBuf = await generateTTS(greeting, voiceName);
      const greetingAudioId = `greeting-${callId}`;
      if (greetingBuf) audioCache.set(greetingAudioId, greetingBuf);

      // Build TwiML URL
      const twimlUrl = `${PUBLIC_URL}/api/voice/twiml?callId=${callId}&audioId=${greetingAudioId}&greetingText=${encodeURIComponent(greeting)}`;

      // Place outbound call via Twilio REST API
      const call = await twilioClient.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: twimlUrl,
        statusCallback: `${PUBLIC_URL}/api/voice/status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
      });

      // Store session
      const session: CallSession = {
        callId,
        callSid: call.sid,
        clientName,
        clientPhone: phoneNumber,
        history: [],
        voiceName,
        systemInstruction,
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

  // ── TwiML: initial call connect ────────────────────────────────────
  // Twilio calls this when the lead answers

  app.all("/api/voice/twiml", async (req, res) => {
    const query = { ...req.query, ...req.body } as Record<string, string>;
    const { callId, audioId, greetingText } = query;

    const twiml = new twilio.twiml.VoiceResponse();
    const session = activeCalls.get(callId);

    if (!session) {
      twiml.say("I apologize, this call cannot be connected. Goodbye.");
      twiml.hangup();
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Mark as active
    session.status = "active";

    // Log the opening greeting into history
    const greetingLineText = greetingText || `Hello, this is VocalBridge calling.`;
    const greetingLine: TranscriptLine = {
      role: "agent",
      text: greetingLineText,
      time: new Date().toLocaleTimeString(),
    };
    session.history.push(greetingLine);
    emitToFrontend(callId, { type: "call_answered", callId });
    emitToFrontend(callId, { type: "transcript", ...greetingLine });

    // Play Gemini TTS greeting or fall back to Twilio Say
    if (audioId && audioCache.has(audioId)) {
      twiml.play(`${PUBLIC_URL}/api/audio/${audioId}`);
    } else {
      twiml.say({ voice: "Polly.Joanna-Neural" }, greetingLineText);
    }

    // Listen for customer response
    const gather = twiml.gather({
      input: ["speech"],
      action: `${PUBLIC_URL}/api/voice/respond?callId=${callId}`,
      method: "POST",
      speechTimeout: "auto",
      timeout: 12,
    });
    gather.pause({ length: 1 });

    // If no input, re-prompt gently
    const reprompt = encodeURIComponent("Are you still there? Take your time.");
    twiml.redirect(`${PUBLIC_URL}/api/voice/twiml?callId=${callId}&greetingText=${reprompt}`);

    res.type("text/xml");
    res.send(twiml.toString());
  });

  // ── TwiML: handle customer speech turn ────────────────────────────

  app.post("/api/voice/respond", async (req, res) => {
    const { callId } = req.query as { callId: string };
    const customerText: string = req.body.SpeechResult || "";

    const session = activeCalls.get(callId);
    const twiml = new twilio.twiml.VoiceResponse();

    // No speech detected
    if (!session || !customerText.trim()) {
      twiml.say({ voice: "Polly.Joanna-Neural" }, "Sorry, I didn't catch that. Could you say that again?");
      twiml.gather({
        input: ["speech"],
        action: `${PUBLIC_URL}/api/voice/respond?callId=${callId}`,
        method: "POST",
        speechTimeout: "auto",
        timeout: 12,
      });
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Log customer turn
    const customerLine: TranscriptLine = {
      role: "customer",
      text: customerText,
      time: new Date().toLocaleTimeString(),
    };
    session.history.push(customerLine);
    emitToFrontend(callId, { type: "transcript", ...customerLine });

    try {
      // Generate AI response text via Gemini
      const responseText = await generateAgentResponse(session, customerText);

      // Generate TTS audio for the response
      const responseAudio = await generateTTS(responseText, session.voiceName);
      const audioId = `resp-${randomUUID()}`;
      if (responseAudio) audioCache.set(audioId, responseAudio);

      // Log agent turn
      const agentLine: TranscriptLine = {
        role: "agent",
        text: responseText,
        time: new Date().toLocaleTimeString(),
      };
      session.history.push(agentLine);
      emitToFrontend(callId, { type: "transcript", ...agentLine });

      // Play Gemini TTS or fall back
      if (responseAudio) {
        twiml.play(`${PUBLIC_URL}/api/audio/${audioId}`);
      } else {
        twiml.say({ voice: "Polly.Joanna-Neural" }, responseText);
      }

      // Check if call should end
      const endKeywords = ["goodbye", "bye", "not interested", "remove me", "stop calling", "do not call", "no thank you", "no thanks"];
      const shouldEnd = endKeywords.some(kw => customerText.toLowerCase().includes(kw));

      if (shouldEnd) {
        const farewell = "I completely understand. I'll make a note and won't call again. Have a great day!";
        const farewellAudio = await generateTTS(farewell, session.voiceName);
        const farewellId = `farewell-${callId}`;
        if (farewellAudio) {
          audioCache.set(farewellId, farewellAudio);
          twiml.play(`${PUBLIC_URL}/api/audio/${farewellId}`);
        } else {
          twiml.say({ voice: "Polly.Joanna-Neural" }, farewell);
        }
        twiml.hangup();
        session.status = "completed";
        emitToFrontend(callId, { type: "call_ended", transcript: session.history });
      } else {
        // Continue conversation
        const gather = twiml.gather({
          input: ["speech"],
          action: `${PUBLIC_URL}/api/voice/respond?callId=${callId}`,
          method: "POST",
          speechTimeout: "auto",
          timeout: 15,
        });
        gather.pause({ length: 1 });
        twiml.redirect(
          `${PUBLIC_URL}/api/voice/twiml?callId=${callId}&greetingText=${encodeURIComponent("Are you still there?")}`
        );
      }
    } catch (err) {
      console.error("[Respond] Error:", err);
      twiml.say(
        { voice: "Polly.Joanna-Neural" },
        "I apologize, could you hold for just a moment while I check that?"
      );
      twiml.gather({
        input: ["speech"],
        action: `${PUBLIC_URL}/api/voice/respond?callId=${callId}`,
        method: "POST",
        speechTimeout: "auto",
      });
    }

    res.type("text/xml");
    res.send(twiml.toString());
  });

  // ── Twilio call status callback ────────────────────────────────────

  app.post("/api/voice/status", (req, res) => {
    const { CallSid, CallStatus } = req.body as { CallSid: string; CallStatus: string };
    const callId = callsBySid.get(CallSid);

    if (callId) {
      const session = activeCalls.get(callId);
      const terminal = ["completed", "failed", "busy", "no-answer", "canceled"];
      if (session && terminal.includes(CallStatus)) {
        session.status = CallStatus === "completed" ? "completed" : "failed";
        emitToFrontend(callId, {
          type: "call_ended",
          twilioStatus: CallStatus,
          transcript: session.history,
        });
        // Clean up audio cache after 2 minutes
        setTimeout(() => {
          for (const [key] of audioCache) {
            if (key.includes(callId)) audioCache.delete(key);
          }
          activeCalls.delete(callId);
          callsBySid.delete(CallSid);
        }, 120_000);
      }
      console.log(`[Status] callId=${callId} status=${CallStatus}`);
    }
    res.sendStatus(204);
  });

  // ── End call manually from frontend ───────────────────────────────

  app.post("/api/calls/end/:callId", async (req, res) => {
    const session = activeCalls.get(req.params.callId);
    if (!session) return res.status(404).json({ error: "Call not found" });
    try {
      await twilioClient.calls(session.callSid).update({ status: "completed" });
      session.status = "completed";
      emitToFrontend(session.callId, { type: "call_ended", transcript: session.history });
      res.json({ success: true, transcript: session.history });
    } catch (err: any) {
      console.error("[End] Failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get live call transcript (polling fallback) ────────────────────

  app.get("/api/calls/:callId/transcript", (req, res) => {
    const session = activeCalls.get(req.params.callId);
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json({ transcript: session.history, status: session.status });
  });

  // ── WebSocket: frontend real-time transcript ───────────────────────

  const wss = new WebSocketServer({ server: httpServer, path: "/ws/calls" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", "ws://localhost");
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
    console.log(`🔌 Frontend WebSocket:  ws://localhost:${PORT}/ws/calls?callId=<id>\n`);
  });
}

startServer().catch(err => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
