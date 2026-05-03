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
rooms: Dict[str, dict] = {}
ROOMS_FILE = "rooms_data.json"

def save_rooms():
    try:
        serializable = {}
        for room_id, room in rooms.items():
            serializable[room_id] = {
                "players": room["players"],
                "fen": room["board"].fen(),
                "status": room.get("status", "waiting")
            }
        with open(ROOMS_FILE, "w") as f:
            json.dump(serializable, f)
        print(f"[Rooms] Saved {len(rooms)} rooms to {ROOMS_FILE}")
    except Exception as e:
        print(f"[Rooms] Error saving: {e}")

def load_rooms():
    if os.path.exists(ROOMS_FILE):
        try:
            with open(ROOMS_FILE) as f:
                data = json.load(f)
            for room_id, room in data.items():
                rooms[room_id] = {
                    "players": room["players"],
                    "board": chess.Board(room["fen"]),
                    "connections": {},
                    "status": room["status"]
                }
            print(f"[Rooms] Loaded {len(rooms)} rooms from {ROOMS_FILE}")
        except Exception as e:
            print(f"[Rooms] Error loading: {e}")

# Initial load
load_rooms()

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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user_email(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# WebSocket version (doesn't raise HTTPException but returns None)
async def get_ws_user_email(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
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
async def create_room(email: str = Depends(get_current_user_email)):
    room_id = secrets.token_hex(3).upper()  # 6-char code
    while room_id in rooms:
        room_id = secrets.token_hex(3).upper()
    rooms[room_id] = {
        "players": [email],
        "board": chess.Board(),
        "connections": {},
        "status": "waiting"
    }
    save_rooms()
    return {"room_id": room_id}

@app.post("/rooms/join/{room_id}")
async def join_room(room_id: str, email: str = Depends(get_current_user_email)):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = rooms[room_id]
    if email in room["players"]:
        return {"status": "already_in"}
    if len(room["players"]) >= 2:
        raise HTTPException(status_code=400, detail="Room is full")
    
    room["players"].append(email)
    room["status"] = "full"
    save_rooms()
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
    email = await get_ws_user_email(token) if token else None
    if not email:
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
                        for p_email, conn in room["connections"].items():
                            p_color = "white" if room["players"][0] == p_email else "black"
                            await conn.send_json({**response, "color": p_color})
                        
                        save_rooms()
                        
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
                            for p_email, conn in room["connections"].items():
                                p_color = "white" if room["players"][0] == p_email else "black"
                                await conn.send_json({**game_over_msg, "color": p_color})
                except Exception as e:
                    print(f"Move error: {e}")

    except WebSocketDisconnect:
        print(f"[WS] {email} disconnected from room {room_id}")
        if email in room["connections"]:
            del room["connections"][email]
        
        # Wait briefly before broadcasting - player might reconnect
        await asyncio.sleep(2)
        
        # Notify opponent only if player is still gone
        if email not in room["connections"]:
            for p_email, conn in room["connections"].items():
                try:
                    await conn.send_json({"type": "opponent_disconnected"})
                except:
                    pass
        
        # If no one left, clean up
        if not room["connections"]:
            if room_id in rooms:
                del rooms[room_id]

@app.post("/analyze-game")
async def analyze_game(data: GameData):
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Coach is disabled (API Key missing)")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"You are a sassy chess coach. Find the biggest mistake in this game and give one sentence of advice. Here is the PGN of the game: {data.pgn}"
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
