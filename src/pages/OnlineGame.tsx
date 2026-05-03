import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, ArrowLeft, Loader2, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWsUrl } from '../lib/api';

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setGame] = useState(new Chess());
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
  
  // Ref to always have the latest status in stale closures (onclose)
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const connectWebSocket = useCallback(() => {
    if (!roomId || !token) {
      setStatus('error');
      setErrorMsg("Authentication session missing. Please login again.");
      return;
    }

    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      socketRef.current.close();
    }

    try {
      const wsUrl = `${getWsUrl()}/ws/game/${roomId}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return;
        console.log("[OnlineGame] WebSocket Connected");
      };

      ws.onmessage = (event) => {
        console.log("[WS] Message received:", event.data)
        if (socketRef.current !== ws) return;
        try {
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
            case 'error':
              setStatus('error');
              setErrorMsg(data.message);
              break;
          }
        } catch (err) {
          console.error("[OnlineGame] Error parsing message:", err);
        }
      };

      ws.onerror = () => {
        if (socketRef.current !== ws) return;
        setStatus('error');
        setErrorMsg("Connection failed. Check if the backend is running.");
      };

      ws.onclose = () => {
        if (socketRef.current === ws) {
          if (statusRef.current === 'playing') {
            setStatus('disconnected');
          } else if (statusRef.current === 'waiting') {
            setStatus('error');
            setErrorMsg("Could not connect to game. The room might be full or your session expired.");
          }
        }
      };
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || "Failed to initialize connection.");
    }
  }, [roomId, token]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomId, token]);



  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-chess-bg flex items-center justify-center p-4">
        <div className="bg-chess-card border border-red-500/20 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Connection Error</h2>
          <p className="text-chess-secondary">{errorMsg || "Connection to game server failed."}</p>
          <div className="grid gap-3 pt-4">
            <button 
              onClick={() => { setStatus('waiting'); connectWebSocket(); }}
              className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              TRY AGAIN
            </button>
            <button 
              onClick={() => navigate('/online')}
              className="w-full py-4 bg-zinc-700 text-white font-bold rounded-2xl transition-all"
            >
              BACK TO LOBBY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-chess-bg p-4 relative overflow-y-auto pt-16 sm:pt-20">
      <div className="absolute top-4 left-4 z-10">
        <button 
          onClick={() => navigate('/online')}
          className="flex items-center gap-2 px-4 py-2 bg-chess-card border border-zinc-700/50 text-white hover:bg-zinc-700 rounded-lg transition-all text-sm font-bold shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Lobby
        </button>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 pb-12">
        {/* Board Section */}
        <div className="space-y-4">
          {/* Opponent Info */}
          <div className="flex items-center justify-between bg-chess-card px-4 py-3 rounded-lg border border-zinc-700/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${playerColor === 'black' ? 'bg-[#f0d9b5] text-zinc-950' : 'bg-[#b58863] text-white'} font-bold text-xs shadow-inner`}>
                {opponent?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex flex-col -space-y-1">
                <p className="text-white font-bold">{opponent || 'Opponent'}</p>
                <p className="text-chess-secondary text-xs">({playerColor === 'white' ? 'Black' : 'White'})</p>
              </div>
            </div>
            {status === 'waiting' && (
              <button 
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-chess-input border border-[#4a4a4a] text-white rounded-md hover:border-chess-green transition-all text-xs font-bold"
              >
                {copied ? <Check className="w-3 h-3 text-chess-green" /> : <Copy className="w-3 h-3 text-chess-secondary" />}
                {roomId}
              </button>
            )}
          </div>

          <div className="w-full aspect-square max-w-[600px] mx-auto overflow-hidden rounded-lg shadow-2xl bg-chess-card relative">
            {status === 'waiting' && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-chess-card rounded-2xl flex items-center justify-center animate-bounce shadow-2xl border border-zinc-700">
                  <Loader2 className="w-8 h-8 text-chess-green animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-white">Waiting for Opponent</h3>
                <p className="text-chess-secondary max-w-xs font-medium">Share the code above with a friend to start.</p>
              </div>
            )}

            {(() => {
              const AnyChessboard = Chessboard as any;
              return (
                <AnyChessboard 
                  position={fen}
                  arePiecesDraggable={true}
                  onPieceDrop={(sourceSquare: string, targetSquare: string) => {
                    const ws = socketRef.current
                    console.log("[DROP] status from ref:", statusRef.current, "ws:", ws?.readyState)
                    if (!ws || ws.readyState !== 1 || statusRef.current !== 'playing') return false
                    ws.send(JSON.stringify({ type: 'move', from: sourceSquare, to: targetSquare, promotion: 'q' }))
                    return true
                  }}
                  boardOrientation={playerColor === 'black' ? 'black' : 'white'}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                  animationDuration={200}
                />
              );
            })()}
          </div>

          {/* Your Info */}
          <div className="flex items-center justify-between bg-chess-card px-4 py-3 rounded-lg border border-zinc-700/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${playerColor === 'white' ? 'bg-[#f0d9b5] text-zinc-950' : 'bg-[#b58863] text-white'} font-bold text-xs shadow-inner`}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col -space-y-1">
                <p className="text-white font-bold">{user?.username}</p>
                <p className="text-chess-secondary text-xs">({playerColor === 'white' ? 'White' : 'Black'})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          <div className="bg-chess-card rounded-xl shadow-2xl p-6 border border-zinc-700/50 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Online Arena</h1>
              <p className="text-chess-secondary text-sm">Room: {roomId}</p>
            </div>

            <div className="bg-chess-input rounded-lg p-4 border border-zinc-700/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 px-4 py-2 bg-[#262421] rounded-full border border-zinc-800 shadow-inner">
                  <div className={`w-3 h-3 rounded-full ${turn === 'white' ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {turn === 'white' ? "White's Turn" : "Black's Turn"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => navigate('/online')}
                className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all shadow-lg text-center"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {(status === 'game_over' || status === 'disconnected') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-chess-card border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-sm p-10 text-center space-y-8 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-chess-bg rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Sparkles className={`w-10 h-10 ${status === 'game_over' ? 'text-chess-green' : 'text-chess-secondary'}`} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {status === 'disconnected' ? 'DISCONNECTED' : 'GAME OVER'}
              </h2>
              <p className="text-chess-green font-bold text-xl uppercase tracking-widest">
                {result?.replace('_', ' ')}
              </p>
            </div>
            <div className="grid gap-3 pt-4">
              <button onClick={() => navigate('/online')} className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg">PLAY AGAIN</button>
              <button onClick={() => navigate('/')} className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all shadow-lg">BACK TO MENU</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
