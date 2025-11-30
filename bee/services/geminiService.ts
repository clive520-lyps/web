import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// We instantiate it lazily or check validity in the function to prevent immediate crashes if key is missing,
// although the prompt guideline says assume it's valid.
// We will instantiate inside the function to ensure fresh state if needed.

export const generateBattleReport = async (score: number): Promise<string> => {
  if (!apiKey) {
    return "Mission Control: Secure line unavailable. (API Key missing)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Select model based on complexity. Flash is great for quick text generation.
    const model = 'gemini-2.5-flash';

    let prompt = "";
    if (score < 500) {
      prompt = `You are a sarcastic space commander debriefing a rookie pilot who just failed miserably in the "Galactic Bee Defense" simulator. The score was only ${score}. Write a short, funny, 2-sentence disappointment log.`;
    } else if (score < 2000) {
      prompt = `You are a space commander debriefing a pilot. They did okay in "Galactic Bee Defense" with a score of ${score}. Write a short, 2-sentence encouraging but firm log.`;
    } else {
      prompt = `You are an ecstatic space commander. The pilot is a legend! They scored ${score} in "Galactic Bee Defense". Write a short, high-energy 2-sentence commendation.`;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Transmission garbled...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Mission Control: Subspace interference preventing detailed report.";
  }
};