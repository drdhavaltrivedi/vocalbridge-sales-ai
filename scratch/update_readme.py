import os

file_path = "/home/brilworks/Downloads/vocalbridge-sales-ai/README.md"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the start and end markers for the section we want to replace
start_marker = "## Architecture"
end_marker = "## Project Structure"

new_architecture_content = """## Architecture

### System Overview

VocalBridge is split into a **Vite/React Frontend** and a **Node.js/Express Backend** that serves as a low-latency bridge between Twilio and Gemini Live.

```mermaid
graph TD
    User((User)) -->|Browser| FE[React Frontend]
    FE -->|HTTP/REST| BE[Express Server]
    FE -->|WebSocket| BE
    
    BE -->|Twilio API| Twilio[Twilio Voice]
    Twilio -->|PSTN Call| Lead((Lead))
    
    Twilio <---MediaStream WS---> BE
    BE <---Gemini Live WS---> Gemini[Gemini 2.0 Flash Live]
    
    BE -->|Read/Write| DB[(Firestore)]
    FE -->|Read/Write| DB
```

### Call Flow Sequence

This diagram illustrates the lifecycle of a call, from the user clicking "Start Call" to the AI hanging up and generating a summary.

```mermaid
sequenceDiagram
    participant U as User (Frontend)
    participant S as Server (Express)
    participant T as Twilio
    participant L as Lead (Phone)
    participant G as Gemini Live
    participant D as Firestore

    U->>S: POST /api/calls/initiate
    S->>T: calls.create(to, from, url)
    T-->>S: 201 Created (CallSid)
    S-->>U: 200 OK (CallId, CallSid)

    Note over T,L: Lead's phone rings...
    L->>T: Answers Call
    T->>S: GET /api/voice/twiml?callId=xxx
    S-->>T: <Connect><Stream url="..."/>

    T->>S: Open MediaStream WS (/ws/stream)
    S->>G: Open Gemini Live WS
    G-->>S: onOpen
    S->>G: Send initial greeting prompt

    loop Active Conversation
        L->>T: Audio (mulaw)
        T->>S: { event: "media" }
        S->>S: Transcode mulaw -> pcm16k
        S->>G: sendRealtimeInput (audio)
        G->>G: AI Logic
        G->>S: { serverContent: audio_pcm24k }
        S->>S: Transcode pcm24k -> mulaw
        S->>T: { event: "media" }
        T->>L: Audio (Voice)
        G->>S: { transcript: "..." }
        S->>U: WS: { type: "transcript", ... }
    end

    L->>T: Hangs up
    T->>S: POST /api/voice/status (completed)
    S->>G: Close Session
    S->>U: WS: { type: "call_ended" }
    S->>G: Request Summary (gemini-2.0-flash)
    G-->>S: JSON Summary
    S->>D: Store Call & Update Client Status
```

### Audio Bridge Transcoding

The server handles real-time transcoding to bridge the gap between telephony standards and modern AI requirements.

```mermaid
flowchart LR
    subgraph TwilioToGemini [Customer Input]
        T1[mulaw 8kHz] --> T2[ulawDecode]
        T2 --> T3[PCM 8kHz]
        T3 --> T4[resampleLinear]
        T4 --> T5[PCM 16kHz]
    end

    subgraph GeminiToTwilio [AI Output]
        G1[PCM 24kHz] --> G2[resampleLinear]
        G2 --> G3[PCM 8kHz]
        G3 --> G4[ulawEncode]
        G4 --> G5[mulaw 8kHz]
    end
```

### Frontend Architecture

The application uses a modular structure with individual error boundaries for every major route to ensure high reliability.

```text
App.tsx (Router & Auth Guard)
├── Public Layer
│   ├── / (LandingPage)
│   └── /docs (DocsPage)
└── Application Layer (Authenticated)
    └── AppLayout (Sidebar + Shell)
        ├── ErrorBoundary (Dashboard)
        ├── ErrorBoundary (ClientManager)
        ├── ErrorBoundary (CallMonitor)
        ├── ErrorBoundary (KnowledgeBase)
        └── ErrorBoundary (Settings)
```

Each route is individually wrapped in `<ErrorBoundary>`. A crash in one component does not take down the whole app.

---

"""

start_index = content.find(start_marker)
end_index = content.find(end_marker)

if start_index != -1 and end_index != -1:
    new_content = content[:start_index] + new_architecture_content + content[end_index:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated README.md")
else:
    print(f"Could not find markers: start={start_index}, end={end_index}")
