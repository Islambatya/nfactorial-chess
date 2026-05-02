import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, LogOut, Sparkles, BrainCircuit, X, ArrowLeft, Loader2, Copy, Check, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'game_over' | 'disconnected'>('waiting');
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !token) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/game/${roomId}/${token}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'state':
          setFen(data.fen);
          setGame(new Chess(data.fen));
          setTurn(data.turn);
          if (data.color) setPlayerColor(data.color);
          if (data.opponent) {
            setOpponent(data.opponent);
            setStatus('playing');
          }
          break;
        case 'opponent_joined':
          setOpponent(data.username);
          setStatus('playing');
          break;
        case 'opponent_disconnected':
          setStatus('disconnected');
          break;
        case 'game_over':
          setStatus('game_over');
          setResult(data.result);
          break;
      }
    };

    ws.onclose = () => {
      if (status !== 'game_over') {
        setStatus('disconnected');
      }
    };

    return () => {
      ws.close();
    };
  }, [roomId, token]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (status !== 'playing') return false;
    if (turn !== playerColor) return false;

    // Local validation
    try {
      const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (!result) return false;

      // Send to server
      socketRef.current?.send(JSON.stringify({
        type: 'move',
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      }));
      return true;
    } catch (e) {
      return false;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-950 p-4 relative overflow-y-auto pt-16 sm:pt-20">
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
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
            <div className="text-zinc-500 text-xs font-mono bg-zinc-800/30 px-3 py-1 rounded-md">
              MODE: ONLINE
            </div>
          </div>

          <div className="w-full aspect-square max-w-[500px] mx-auto overflow-hidden rounded-xl border-8 border-zinc-800 shadow-2xl bg-zinc-800/20">
            <Chessboard 
              options={{
                position: fen, 
                onPieceDrop: (s, t) => onDrop(s, t as string),
                boardOrientation: playerColor || "white",
                darkSquareStyle: { backgroundColor: '#3f3f46' },
                lightSquareStyle: { backgroundColor: '#a1a1aa' },
                animationDurationInMs: 200,
              }}
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
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">You ({playerColor})</p>
              <p className="text-zinc-100 font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {(status === 'game_over' || status === 'disconnected') && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-2">
              <Sparkles className={`w-10 h-10 ${status === 'game_over' ? 'text-yellow-500' : 'text-zinc-500'}`} />
            </div>
            
            <div>
              <h2 className="text-3xl font-black text-zinc-50 tracking-tighter uppercase italic">
                {status === 'disconnected' ? 'DISCONNECTED' : result?.replace('_', ' ')}
              </h2>
              <p className="text-zinc-500 mt-2">
                {status === 'disconnected' ? 'Your opponent left the field.' : 'A legendary battle has concluded.'}
              </p>
            </div>

            <div className="grid gap-3">
              <button 
                onClick={() => navigate('/online')}
                className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-black rounded-2xl transition-all shadow-lg active:scale-95"
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold rounded-2xl transition-all"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
