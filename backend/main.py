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

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[HTTP] {request.method} {request.url}")
    if request.method == "POST":
        try:
            body = await request.body()
            print(f"[HTTP] Body: {body.decode()}")
        except:
            pass
    response = await call_next(request)
    print(f"[HTTP] Response status: {response.status_code}")
    return response

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
            username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    try:
        conn.execute("ALTER TABLE users ADD COLUMN username TEXT")
    except Exception:
        pass
    conn.execute("""
        CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            white_player TEXT NOT NULL,
            black_player TEXT NOT NULL,
            pgn TEXT,
            result TEXT,
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add owner_email column if it doesn't exist yet
    try:
        conn.execute("ALTER TABLE game_history ADD COLUMN owner_email TEXT")
    except Exception:
        pass  # Column already exists
    conn.commit()
    conn.close()

init_db()

# Gemini Configuration
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("models/gemini-flash-latest")

print("Available Gemini Models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)

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
    username: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class GameData(BaseModel):
    pgn: str
    color: str = 'white'

class SaveGameData(BaseModel):
    white_player: str
    black_player: str
    pgn: str
    result: str

class GameHistoryData(BaseModel):
    white_player: str
    black_player: str
    pgn: str = ""
    result: str = ""

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
    username = (user.username or "").strip() or user.email.split("@", 1)[0]
    conn = get_db()
    conn.execute("INSERT INTO users (email, hashed_password, username) VALUES (?, ?, ?)", 
                 (user.email, hashed_password, username))
    conn.commit()
    conn.close()
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "username": username}}

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    print(f"[AUTH] Login attempt for: {user.email}")
    db_user = get_user(user.email)
    if not db_user:
        print(f"[AUTH] Login failed: User not found: {user.email}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not pwd_context.verify(user.password, db_user["hashed_password"]):
        print(f"[AUTH] Login failed: Invalid password for: {user.email}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    print(f"[AUTH] Login successful for: {user.email}")
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": db_user["email"], "username": db_user["username"]}}

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
    await websocket.accept()
    token = websocket.query_params.get("token")
    email = await get_ws_user_email(token) if token else None
    print(f"[WS] Connection handshake accepted for {email or 'unknown'} in room {room_id}")

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
    print(f"[WS] Connection established for {email} in room {room_id}")

    # Determine color
    color = "white" if room["players"][0] == email else "black"
    print(f"[WS] Assigned {color} to {email}")
    
    db_user = get_user(email)
    username = db_user["username"] if db_user else email

    # Notify others
    for p_email, conn in room["connections"].items():
        if p_email != email:
            print(f"[WS] Notifying {p_email} that {email} joined")
            await conn.send_json({
                "type": "opponent_joined",
                "username": username
            })
        
    # Send initial state
    opponent_email = None
    opponent_username = None
    if len(room["players"]) > 1:
        opponent_email = room["players"][1] if color == "white" else room["players"][0]
        opp_db = get_user(opponent_email)
        opponent_username = opp_db["username"] if opp_db else opponent_email

    await websocket.send_json({
        "type": "state",
        "fen": room["board"].fen(),
        "turn": "white" if room["board"].turn == chess.WHITE else "black",
        "color": color,
        "opponent": opponent_username
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
                board = room["board"]
                is_white_turn = board.turn == chess.WHITE
                print(f"[WS] Move attempt: {data['from']}->{data['to']} by {email} (color={color}, white_turn={is_white_turn})")
                
                if (is_white_turn and color != "white") or (not is_white_turn and color != "black"):
                    print(f"[WS] REJECTED: wrong turn")
                    continue

                try:
                    from_sq = data["from"]
                    to_sq = data["to"]
                    piece = board.piece_at(chess.parse_square(from_sq))
                    is_promotion = (
                        piece is not None and
                        piece.piece_type == chess.PAWN and
                        to_sq[1] in ("1", "8")
                    )
                    uci = from_sq + to_sq + (data.get("promotion", "q") if is_promotion else "")
                    print(f"[WS] UCI: {uci}, legal_moves count: {board.legal_moves.count()}")
                    move = chess.Move.from_uci(uci)
                    print(f"[WS] Move legal: {move in board.legal_moves}")
                    
                    if move in board.legal_moves:
                        board.push(move)
                        response = {
                            "type": "state",
                            "fen": board.fen(),
                            "turn": "white" if board.turn == chess.WHITE else "black",
                            "lastMove": {"from": from_sq, "to": to_sq}
                        }
                        for p_email, conn in room["connections"].items():
                            p_color = "white" if room["players"][0] == p_email else "black"
                            await conn.send_json({**response, "color": p_color})
                        save_rooms()
                        
                        if board.is_game_over():
                            result = "draw"
                            if board.is_checkmate():
                                result = "white_wins" if not is_white_turn else "black_wins"
                            game_over_msg = {"type": "game_over", "result": result, "reason": str(board.outcome().termination)}
                            for p_email, conn in room["connections"].items():
                                p_color = "white" if room["players"][0] == p_email else "black"
                                await conn.send_json({**game_over_msg, "color": p_color})
                    else:
                        print(f"[WS] REJECTED: move {uci} not in legal moves")
                except Exception as e:
                    print(f"[WS] Move error: {e}")

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

@app.post("/history")
async def save_game_legacy(data: SaveGameData, email: str = Depends(get_current_user_email)):
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO game_history (white_player, black_player, pgn, result, owner_email) VALUES (?, ?, ?, ?, ?)",
            (data.white_player, data.black_player, data.pgn, data.result, email)
        )
        conn.commit()
        conn.close()
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/history/save")
async def save_game(data: GameHistoryData, email: str = Depends(get_current_user_email)):
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO game_history (white_player, black_player, pgn, result, owner_email) VALUES (?, ?, ?, ?, ?)",
            (data.white_player, data.black_player, data.pgn, data.result, email)
        )
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
async def get_history(email: str = Depends(get_current_user_email)):
    try:
        conn = get_db()
        rows = conn.execute(
            """SELECT id, white_player, black_player, pgn, result, played_at
               FROM game_history
               WHERE owner_email = ?
               ORDER BY played_at DESC""",
            (email,)
        ).fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-game")
async def analyze_game(data: GameData):
    try:
        if data.color == 'white':
            color_context = "Analyze this game from White's perspective."
        else:
            color_context = "Analyze this game from Black's perspective."
        
        prompt = f"""You are a brutally honest, savage chess coach. You do NOT sugarcoat anything. 
        You speak like a disappointed parent mixed with a drill sergeant. 
        Find the single worst move made by the {data.color} player and roast them for it in 2-3 sentences. 
        Be specific about the move and why it was terrible. Use human, emotional language. No chess jargon without explanation.
        Game PGN: {data.pgn}
        {color_context}"""
        
        response = gemini_model.generate_content(prompt)
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
