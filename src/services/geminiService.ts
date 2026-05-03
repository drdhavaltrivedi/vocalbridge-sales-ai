import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODELS = {
  GENERAL: "gemini-2.0-flash",
  LIVE: "gemini-2.0-flash-live-001",
  TTS: "gemini-2.5-flash-preview-tts"
};

export const SALES_SYSTEM_INSTRUCTION = `
You are a highly skilled, empathetic, and persuasive Sales Professional.
Your goal is to sell our technical products and services.

CORE RULES:
1. NEVER mention you are an AI or a robot. If asked, you are a senior sales manager.
2. Tone: Professional yet warm, human, and rapport-building.
3. Objections: Treat them with curiosity. "That's a valid concern, many of our clients felt the same way until..."
4. Follow-ups: If the customer is busy, suggest a specific time to talk later.
5. Knowledge: Use the provided knowledge base segments to answer technical questions accurately.
6. Personality: You are helpful, slightly witty but always respectful. No robotic phrases like "As an AI model..."
7. Goal: Secure a commitment, a demo booking, or a follow-up meeting.
`;

export async function generateSummary(clientName: string, transcript: string) {
  const prompt = `
    Analyze the following sales call transcript between our AI Agent and the customer ${clientName}.
    Provide a detailed summary in JSON format with the following fields:
    - customerName: string
    - keyPoints: string[] (top 3-5 discussion points)
    - objections: string[] (specific objections raised by the customer)
    - sentiment: "Positive" | "Neutral" | "Negative"
    - outcome: "Sale Made" | "Follow-up Scheduled" | "Not Interested" | "No Answer" (Strictly choose one of these)
    - roiProjection: string (Detailed breakdown of potential ROI based on the conversation)
    - upsellOpportunities: string[] (Potential next-level products or services they might need)
    - nextSteps: string

    TRANSCRIPT:
    ${transcript}
  `;

  const response = await ai.models.generateContent({
    model: MODELS.GENERAL,
    contents: prompt
  });

  const text = response.text ?? "";
  const jsonStr = text.replace(/```json\n?|```\n?/g, "").trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse summary response from AI');
  }
}

export async function processKnowledgeSource(type: 'file' | 'url', content: string, fileData?: { data: string, mimeType: string }) {
  let prompt = "";
  let parts: any[] = [];

  if (type === 'url') {
    prompt = `Extract the core product information, FAQs, and service details from this text (which was scraped from a website). Format it as a clean, structured knowledge base article:
    
    CONTENT:
    ${content}`;
    parts = [{ text: prompt }];
  } else {
    prompt = `Summarize and structure this document content for inclusion in a sales AI knowledge base. Focus on technical specs, pricing, and FAQs. Provide the output in a clean, professional format.`;
    
    if (fileData) {
      // Multimodal processing (PDF, Image, etc.)
      parts = [
        { inlineData: { data: fileData.data, mimeType: fileData.mimeType } },
        { text: prompt }
      ];
    } else {
      // Fallback for text content
      parts = [{ text: `${prompt}\n\nCONTENT:\n${content}` }];
    }
  }

  const response = await ai.models.generateContent({
    model: MODELS.GENERAL,
    contents: [{ role: 'user', parts }]
  });

  return response.text || "";
}

export async function textToSpeech(text: string, voiceName: string = 'Kore', speed: number = 1.0, pitch: number = 1.0) {
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        },
      },
    },
  });
  
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
