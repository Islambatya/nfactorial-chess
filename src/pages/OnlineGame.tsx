import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, ArrowLeft, Loader2, Copy, Check, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'game_over' | 'disconnected' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    // Debug logs as requested
    console.log('[DEBUG] token:', token || localStorage.getItem('token'));
    console.log('[DEBUG] roomId:', roomId);

    if (!roomId || !token) {
      console.error("[OnlineGame] Missing roomId or token", { roomId, token });
      setStatus('error');
      setErrorMsg("Authentication session missing. Please login again.");
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/game/${roomId}?token=${token}`;
      console.log(`[OnlineGame] Connecting to WebSocket: ${wsUrl.split('?')[0]}?[TOKEN]`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("[OnlineGame] WebSocket Connected Successfully");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[OnlineGame] Received WebSocket message:", data.type, data);
          
          switch (data.type) {
            case 'state':
              setFen(data.fen);
              setGame(new Chess(data.fen));
              setTurn(data.turn);
              if (data.color) setPlayerColor(data.color);
              if (data.opponent) {
                setOpponent(data.opponent);
                setStatus('playing');
              } else {
                setStatus('waiting');
              }
              break;
            case 'opponent_joined':
              console.log("[OnlineGame] Opponent joined:", data.username);
              setOpponent(data.username);
              setStatus('playing');
              break;
            case 'opponent_disconnected':
              console.log("[OnlineGame] Opponent disconnected");
              setStatus('disconnected');
              break;
            case 'game_over':
              console.log("[OnlineGame] Game over:", data.result);
              setStatus('game_over');
              setResult(data.result);
              break;
            case 'error':
              console.error("[OnlineGame] Server error:", data.message);
              setStatus('error');
              setErrorMsg(data.message);
              break;
          }
        } catch (err) {
          console.error("[OnlineGame] Error parsing message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[OnlineGame] WebSocket Error:", event);
        setStatus('error');
        setErrorMsg("Connection failed. Check if the backend is running.");
      };

      ws.onclose = (event) => {
        console.log("[OnlineGame] WebSocket Closed:", event.code, event.reason);
        if (status !== 'game_over' && status !== 'error' && status !== 'disconnected') {
          setStatus('disconnected');
        }
      };
    } catch (err: any) {
      console.error("[OnlineGame] WebSocket Exception:", err);
      setStatus('error');
      setErrorMsg(err.message || "Failed to initialize connection.");
    }
  }, [roomId, token, status]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      console.log("[OnlineGame] Cleaning up WebSocket");
      socketRef.current?.close();
    };
  }, [roomId, token]);

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (status !== 'playing') return false;
    if (turn !== playerColor) return false;

    try {
      const move = { from: sourceSquare, to: targetSquare as string, promotion: 'q' };
      const gameCopy = new Chess(game.fen());
      const moveResult = gameCopy.move(move);
      
      if (!moveResult) return false;

      // Send to server
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'move',
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-red-500/20 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-50">Connection Error</h2>
          <p className="text-zinc-500">{errorMsg || "Connection to game server failed."}</p>
          <div className="grid gap-3 pt-4">
            <button 
              onClick={() => { setStatus('waiting'); connectWebSocket(); }}
              className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              TRY AGAIN
            </button>
            <button 
              onClick={() => navigate('/online')}
              className="w-full py-4 bg-zinc-800 text-zinc-100 font-bold rounded-2xl transition-all"
            >
              BACK TO LOBBY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-950 p-4 relative overflow-y-auto pt-16 sm:pt-20">
      <div className="absolute top-4 left-4 z-10">
        <button 
          onClick={() => navigate('/online')}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full transition-all text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Lobby
        </button>
      </div>

      <div className="max-w-2xl w-full space-y-6 pb-12">
        {/* Opponent Info */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${playerColor === 'black' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Opponent</p>
              <p className="text-zinc-100 font-medium">{opponent || 'Waiting for player...'}</p>
            </div>
          </div>
          {status === 'waiting' && (
            <button 
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl hover:border-zinc-600 transition-all text-sm font-bold"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {roomId}
            </button>
          )}
        </div>

        {/* Board Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          {status === 'waiting' && (
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center animate-bounce shadow-2xl">
                <Loader2 className="w-8 h-8 text-zinc-100 animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-50">Waiting for Opponent</h3>
              <p className="text-zinc-500 max-w-xs">Share the code above with a friend to start the duel.</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-zinc-800/50 px-4 py-2 rounded-full border border-zinc-700/50">
              <div className={`w-3 h-3 rounded-full ${turn === 'white' ? 'bg-zinc-200' : 'bg-zinc-600'}`} />
              <span className="font-bold text-zinc-200 uppercase tracking-widest text-xs">
                {turn === playerColor ? 'YOUR TURN' : "OPPONENT'S TURN"}
              </span>
            </div>
            <div className="text-zinc-500 text-xs font-mono bg-zinc-800/30 px-3 py-1 rounded-md uppercase tracking-wider">
              ONLINE: {playerColor}
            </div>
          </div>

          <div className="w-full aspect-square max-w-[500px] mx-auto overflow-hidden rounded-xl border-8 border-zinc-800 shadow-2xl bg-zinc-800/20">
            <Chessboard 
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={playerColor || "white"}
              customDarkSquareStyle={{ backgroundColor: '#3f3f46' }}
              customLightSquareStyle={{ backgroundColor: '#a1a1aa' }}
              animationDuration={200}
            />
          </div>
        </div>

        {/* Your Info */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${playerColor === 'white' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">You</p>
              <p className="text-zinc-100 font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {(status === 'game_over' || status === 'disconnected') && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-2">
              <Sparkles className={`w-10 h-10 ${status === 'game_over' ? 'text-yellow-500' : 'text-zinc-500'}`} />
            </div>
            <h2 className="text-3xl font-black text-zinc-50 tracking-tighter uppercase italic">
              {status === 'disconnected' ? 'DISCONNECTED' : result?.replace('_', ' ')}
            </h2>
            <div className="grid gap-3 pt-4">
              <button onClick={() => navigate('/online')} className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-black rounded-2xl transition-all">PLAY AGAIN</button>
              <button onClick={() => navigate('/')} className="w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold rounded-2xl transition-all">BACK TO MENU</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
