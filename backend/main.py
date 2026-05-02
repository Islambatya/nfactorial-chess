import os
import sqlite3
import secrets
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Set
from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv
import google.generativeai as genai
import chess

# Load environment variables
load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt-change-it-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Initialize FastAPI
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Database setup
DB_PATH = "users.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Gemini Configuration
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# In-memory room storage
# room_id -> { "players": [email1, email2], "board": chess.Board, "connections": {email: WebSocket} }
rooms: Dict[str, dict] = {}

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class GameData(BaseModel):
    pgn: str

class RoomResponse(BaseModel):
    room_id: str

# Helper functions
def get_user(email: str):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user_email(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None

# REST Endpoints
@app.post("/register", response_model=Token)
async def register(user: UserCreate):
    if get_user(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(user.password)
    conn = get_db()
    conn.execute("INSERT INTO users (email, hashed_password) VALUES (?, ?)", (user.email, hashed_password))
    conn.commit()
    conn.close()
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email}}

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = get_user(user.email)
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email}}

@app.post("/rooms/create", response_model=RoomResponse)
async def create_room():
    room_id = secrets.token_hex(3).upper()  # 6-char code
    while room_id in rooms:
        room_id = secrets.token_hex(3).upper()
    rooms[room_id] = {
        "players": [],
        "board": chess.Board(),
        "connections": {},
        "status": "waiting"
    }
    return {"room_id": room_id}

@app.post("/rooms/join/{room_id}")
async def join_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    if len(rooms[room_id]["players"]) >= 2:
        raise HTTPException(status_code=400, detail="Room is full")
    return {"status": "ok"}

@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = rooms[room_id]
    return {
        "room_id": room_id,
        "players_count": len(room["players"]),
        "status": room["status"]
    }

# WebSocket logic
@app.websocket("/ws/game/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    token = websocket.query_params.get("token")
    print(f"[WS] Connection request for room {room_id} with token: {token[:10] if token else 'None'}...")
    
    email = await get_current_user_email(token) if token else None
    if not email:
        print(f"[WS] Connection rejected: Invalid token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if room_id not in rooms:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    room = rooms[room_id]
    print(f"[WS] Room {room_id} status: {room['status']}, Players: {room['players']}")
    
    if email not in room["players"]:
        if len(room["players"]) >= 2:
            print(f"[WS] Room {room_id} is full. Rejecting {email}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        room["players"].append(email)
        print(f"[WS] Player {email} added to room {room_id}")

    room["connections"][email] = websocket
    await websocket.accept()
    print(f"[WS] Connection accepted for {email} in room {room_id}")

    # Determine color
    color = "white" if room["players"][0] == email else "black"
    print(f"[WS] Assigned {color} to {email}")
    
    # Notify others
    for p_email, conn in room["connections"].items():
        if p_email != email:
            print(f"[WS] Notifying {p_email} that {email} joined")
            await conn.send_json({
                "type": "opponent_joined",
                "username": email
            })
        
    # Send initial state
    opponent_email = None
    if len(room["players"]) > 1:
        opponent_email = room["players"][1] if color == "white" else room["players"][0]

    await websocket.send_json({
        "type": "state",
        "fen": room["board"].fen(),
        "turn": "white" if room["board"].turn == chess.WHITE else "black",
        "color": color,
        "opponent": opponent_email
    })
    print(f"[WS] Initial state sent to {email}")

    if len(room["players"]) == 2:
        room["status"] = "full"
        print(f"[WS] Room {room_id} is now FULL")

    try:
        while True:
            data = await websocket.receive_json()
            print(f"[WS] Received from {email}: {data}")
            if data["type"] == "move":
                # Validate turn
                board = room["board"]
                is_white_turn = board.turn == chess.WHITE
                if (is_white_turn and color != "white") or (not is_white_turn and color != "black"):
                    print(f"[WS] Illegal turn: {email} tried to move but it is {board.turn} turn")
                    continue

                try:
                    move = chess.Move.from_uci(data["from"] + data["to"] + (data.get("promotion") or ""))
                    if move in board.legal_moves:
                        board.push(move)
                        
                        # Broadcast state update
                        response = {
                            "type": "state",
                            "fen": board.fen(),
                            "turn": "white" if board.turn == chess.WHITE else "black",
                            "lastMove": {"from": data["from"], "to": data["to"]}
                        }
                        for conn in room["connections"].values():
                            await conn.send_json(response)
                        
                        # Check for game over
                        if board.is_game_over():
                            result = "draw"
                            if board.is_checkmate():
                                result = "white_wins" if not is_white_turn else "black_wins"
                            
                            game_over_msg = {
                                "type": "game_over",
                                "result": result,
                                "reason": str(board.outcome().termination)
                            }
                            for conn in room["connections"].values():
                                await conn.send_json(game_over_msg)
                except Exception as e:
                    print(f"Move error: {e}")

    except WebSocketDisconnect:
        if email in room["connections"]:
            del room["connections"][email]
        
        # Notify opponent
        for p_email, conn in room["connections"].items():
            await conn.send_json({"type": "opponent_disconnected"})
        
        # If no one left, clean up
        if not room["connections"]:
            if room_id in rooms:
                del rooms[room_id]

@app.post("/analyze-game")
async def analyze_game(data: GameData):
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Coach is disabled (API Key missing)")
    try:
        model = genai.GenerativeModel("models/gemini-flash-latest")
        prompt = f"Ты — дерзкий шахматный тренер. Найди главную ошибку в этой партии и дай совет на одну фразу. Вот PGN партии: {data.pgn}"
        response = model.generate_content(prompt)
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
