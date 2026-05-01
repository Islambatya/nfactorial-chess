import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function analyzeChessGame(pgn: string) {
  console.log("Analyzing game with PGN:", pgn);
  if (!genAI) {
    console.error("API Key is missing in environment variables");
    return "AI Coach is currently disabled. Please add your Gemini API Key to .env.local";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Ты — дерзкий шахматный тренер. Найди главную ошибку в этой партии и дай совет на одну фразу. Вот PGN партии: ${pgn}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini AI error details:", error);
    return `Ошибка ИИ: ${error.message || 'Unknown error'}. Попробуйте еще раз!`;
  }
}
