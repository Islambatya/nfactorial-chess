import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment")
genai.configure(api_key=api_key)

class GameData(BaseModel):
    pgn: str

@app.post("/analyze-game")
async def analyze_game(data: GameData):
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Coach is disabled (API Key missing)")
    
    try:
        # Using gemini-flash-latest as confirmed working for the user's key
        model = genai.GenerativeModel("models/gemini-flash-latest")
        prompt = f"Ты — дерзкий шахматный тренер. Найди главную ошибку в этой партии и дай совет на одну фразу. Вот PGN партии: {data.pgn}"
        
        response = model.generate_content(prompt)
        return {"analysis": response.text}
    except Exception as e:
        print(f"Error in Gemini analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
