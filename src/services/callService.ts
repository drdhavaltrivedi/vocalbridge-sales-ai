export interface TranscriptLine {
  role: "agent" | "customer";
  text: string;
  time: string;
}

export interface CallInitiateParams {
  clientName: string;
  phoneNumber: string;
  voiceName?: string;
  agentName?: string;
  systemInstruction?: string;
}

export interface CallInitiateResult {
  callId: string;
  callSid: string;
  status: string;
}

export interface TranscriptCallbacks {
  onTranscript: (line: TranscriptLine) => void;
  onCallAnswered: () => void;
  onCallEnded: (data: { twilioStatus?: string; transcript: TranscriptLine[] }) => void;
  onConnected: () => void;
  onError: (err: Error) => void;
}

// When VITE_SERVER_URL is set (e.g. on Vercel pointing at Railway),
// use it as the base for all API and WebSocket calls.
// In local dev it is empty so relative URLs are used (same-origin Express server).
const SERVER_URL = ((import.meta.env.VITE_SERVER_URL as string | undefined) ?? "").replace(/\/$/, "");

const WS_BASE = SERVER_URL
  ? SERVER_URL.replace(/^https/, "wss").replace(/^http/, "ws")
  : `${typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws"}://${typeof window !== "undefined" ? window.location.host : "localhost"}`;

export async function initiateCall(params: CallInitiateParams): Promise<CallInitiateResult> {
  const res = await fetch(`${SERVER_URL}/api/calls/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Failed to initiate call");
  }
  return res.json();
}

export async function endCall(callId: string): Promise<TranscriptLine[]> {
  const res = await fetch(`${SERVER_URL}/api/calls/end/${callId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to end call");
  const body = await res.json();
  return body.transcript ?? [];
}

export function connectTranscriptStream(callId: string, callbacks: TranscriptCallbacks): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/calls?callId=${callId}`);

  ws.onopen = () => callbacks.onConnected();

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      switch (msg.type) {
        case "transcript":
          callbacks.onTranscript({ role: msg.role, text: msg.text, time: msg.time });
          break;
        case "call_answered":
          callbacks.onCallAnswered();
          break;
        case "call_ended":
          callbacks.onCallEnded({ twilioStatus: msg.twilioStatus, transcript: msg.transcript ?? [] });
          break;
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = () => callbacks.onError(new Error("Real-time connection failed"));
  ws.onclose = () => {};

  return ws;
}
