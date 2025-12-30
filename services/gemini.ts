
import { GoogleGenAI } from "@google/genai";

// Use a getter to handle potential late-binding of the process polyfill
const getApiKey = () => {
  const win = window as any;
  return win.process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : "");
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function suggestFolders(currentFolders: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these existing folders: ${currentFolders.join(', ')}, suggest 3 new relevant social platforms or communities for a "follow-for-follow" app. Return only comma-separated values.`,
    });
    return response.text?.split(',')?.map(s => s.trim()) || [];
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
}

export async function optimizeIdentity(inputName: string, link: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transform this username "${inputName}" and link "${link}" into a professional social identity for a community hub. 
      If it's an X/Twitter profile, make it sound like an influencer. If it's LinkedIn, make it professional. 
      Return ONLY the optimized name (max 20 characters).`,
    });
    return response.text?.trim() || inputName;
  } catch (error) {
    console.error("Gemini Identity Optimization Error:", error);
    return inputName;
  }
}
