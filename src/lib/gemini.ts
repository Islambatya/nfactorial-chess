import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function analyzeChessGame(pgn: string) {
  if (!genAI) {
    return "AI Coach is currently disabled. Please add your Gemini API Key to .env.local";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Ты — дерзкий шахматный тренер. Найди главную ошибку в этой партии и дай совет на одну фразу. Вот PGN партии: ${pgn}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Не удалось получить совет от тренера. Попробуйте еще раз!";
  }
}
