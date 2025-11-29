import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EssayConfig, EssayGenre } from "../types";
import { base64ToUint8Array } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
// Note: We create a new instance per call in complex apps, but here a singleton or function-scoped instance is fine.
// We'll create it inside functions to ensure we pick up the latest env var if it changes (though usually static).

export const autoPlanEssay = async (title: string, summary: string): Promise<Partial<EssayConfig>> => {
  if (!title || !summary) throw new Error("請輸入標題和文章大意");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    你是一位專業的中文作文老師。請根據使用者提供的作文題目與大意，規劃出一份作文大綱。
    
    題目: ${title}
    大意: ${summary}
    
    請回傳一個 JSON 物件，包含以下欄位：
    - genre: 建議的文體 (記敘文, 議論文, 詩歌, 說明文, 應用文, 抒情文)
    - paragraphCount: 建議的段落數量 (整數，範圍 1-8)
    - wordCount: 建議的文章總字數 (整數)
    - paragraphSummaries: 一個字串陣列，包含每一段的段落大意 (陣列長度必須等於 paragraphCount)
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          genre: { type: Type.STRING, enum: Object.values(EssayGenre) },
          paragraphCount: { type: Type.INTEGER },
          wordCount: { type: Type.INTEGER },
          paragraphSummaries: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["genre", "paragraphCount", "wordCount", "paragraphSummaries"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("無法產生規劃");

  const json = JSON.parse(text);
  
  return {
    genre: json.genre as EssayGenre,
    paragraphCount: json.paragraphCount,
    wordCount: json.wordCount,
    paragraphSummaries: json.paragraphSummaries
  };
};

export const generateEssayContent = async (config: EssayConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
    請撰寫一篇繁體中文作文。
    
    題目: ${config.title}
    文章大意: ${config.summary}
    文體: ${config.genre}
    預計字數: ${config.wordCount}
    段落數: ${config.paragraphCount}
    
    各段大意規劃:
    ${config.paragraphSummaries.map((s, i) => `第 ${i + 1} 段: ${s}`).join('\n')}
    
    請直接輸出文章內容，不要包含題目或額外的說明文字。文章內容必須符合上述規劃。
    請使用優美流暢的繁體中文。
  `;

  const response = await ai.models.generateContent({
    // Using gemini-3-pro-preview for complex creative writing tasks
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  if (!response.text) throw new Error("無法產生文章");
  return response.text;
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Gemini TTS 
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: {
        parts: [{ text: text }]
    },
    config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Kore' is usually a good neutral voice, or 'Fenrir', 'Puck', 'Zephyr'
            }
        }
    }
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) {
      throw new Error("無法產生語音");
  }

  return audioData;
};