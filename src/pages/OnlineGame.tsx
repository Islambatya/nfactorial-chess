import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Sparkles, ArrowLeft, Loader2, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWsUrl } from '../lib/api';

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'game_over' | 'disconnected' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { token, user } = useAuth();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const playerColorRef = useRef<'white' | 'black'>('white');
  const statusRef = useRef<string>('waiting');
  const [playerColorState, setPlayerColorState] = useState<'white' | 'black'>('white');

  const connect = useCallback(() => {
    if (!roomId || !token) return;
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${getWsUrl()}/ws/game/${roomId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] connected');

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('[WS] msg:', data);

      if (data.type === 'state') {
        setFen(data.fen);
        setTurn(data.turn);
        if (data.color) {
          playerColorRef.current = data.color;
          setPlayerColorState(data.color);
        }
        if (data.opponent) {
          setOpponent(data.opponent);
          setStatus('playing');
          statusRef.current = 'playing';
        }
      } else if (data.type === 'opponent_joined') {
        setOpponent(data.username);
        setStatus('playing');
        statusRef.current = 'playing';
      } else if (data.type === 'opponent_disconnected') {
        setStatus('disconnected');
        statusRef.current = 'disconnected';
      } else if (data.type === 'game_over') {
        setStatus('game_over');
        statusRef.current = 'game_over';
        setResult(data.result);
      } else if (data.type === 'error') {
        setStatus('error');
        statusRef.current = 'error';
        setErrorMsg(data.message);
      }
    };

    ws.onerror = () => {
      setStatus('error');
      statusRef.current = 'error';
      setErrorMsg('Connection failed.');
    };

    ws.onclose = () => {
      if (statusRef.current === 'playing') {
        setStatus('disconnected');
        statusRef.current = 'disconnected';
      }
    };
  }, [roomId, token]);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  const onDrop = (source: string, target: string) => {
    console.log('[DROP]', source, '->', target, '| status:', statusRef.current, '| ws:', wsRef.current?.readyState);
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    if (statusRef.current !== 'playing') return false;
    ws.send(JSON.stringify({ type: 'move', from: source, to: target, promotion: 'q' }));
    return true;
  };

  const copyCode = () => {
    if (roomId) { navigator.clipboard.writeText(roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (status === 'error') return (
    <div className="min-h-screen bg-chess-bg flex items-center justify-center p-4">
      <div className="bg-chess-card border border-red-500/20 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Connection Error</h2>
        <p className="text-chess-secondary">{errorMsg}</p>
        <button onClick={() => { setStatus('waiting'); statusRef.current = 'waiting'; connect(); }}
          className="w-full py-4 bg-chess-green text-white font-bold rounded-2xl flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5" /> TRY AGAIN
        </button>
        <button onClick={() => navigate('/online')} className="w-full py-4 bg-zinc-700 text-white font-bold rounded-2xl">BACK TO LOBBY</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-chess-bg p-4 relative overflow-y-auto pt-16 sm:pt-20">
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => navigate('/online')} className="flex items-center gap-2 px-4 py-2 bg-chess-card border border-zinc-700/50 text-white hover:bg-zinc-700 rounded-lg text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 pb-12">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-chess-card px-4 py-3 rounded-lg border border-zinc-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#b58863] text-white flex items-center justify-center font-bold text-xs">
                {opponent?.[0]?.toUpperCase() || '?'}
              </div>
              <p className="text-white font-bold">{opponent || 'Waiting...'}</p>
            </div>
            {status === 'waiting' && (
              <button onClick={copyCode} className="flex items-center gap-2 px-3 py-1.5 bg-chess-input border border-[#4a4a4a] text-white rounded-md text-xs font-bold">
                {copied ? <Check className="w-3 h-3 text-chess-green" /> : <Copy className="w-3 h-3" />} {roomId}
              </button>
            )}
          </div>

          <div className="w-full aspect-square max-w-[600px] mx-auto rounded-lg shadow-2xl relative overflow-hidden">
            {status === 'waiting' && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-chess-green animate-spin" />
                <h3 className="text-2xl font-bold text-white">Waiting for Opponent</h3>
                <p className="text-chess-secondary">Share the code above with a friend.</p>
              </div>
            )}
            {(() => {
              const AnyChessboard = Chessboard as any;
              return (
                <AnyChessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  boardOrientation={playerColorState === 'black' ? 'black' : 'white'}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                  animationDuration={200}
                />
              );
            })()}
          </div>

          <div className="flex items-center gap-3 bg-chess-card px-4 py-3 rounded-lg border border-zinc-700/50">
            <div className="w-8 h-8 rounded-full bg-[#f0d9b5] text-zinc-950 flex items-center justify-center font-bold text-xs">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-white font-bold">{user?.username}</p>
            <p className="text-chess-secondary text-xs">({playerColorState})</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-chess-card rounded-xl shadow-2xl p-6 border border-zinc-700/50 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Online Arena</h1>
              <p className="text-chess-secondary text-sm">Room: {roomId}</p>
            </div>
            <div className="bg-chess-input rounded-lg p-4 border border-zinc-700/50">
              <div className={`w-3 h-3 rounded-full inline-block mr-2 ${turn === 'white' ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}`} />
              <span className="font-bold text-chess-green uppercase tracking-wide">
                {status === 'playing' ? (turn === playerColorState ? 'YOUR TURN' : "OPPONENT'S TURN") : status.toUpperCase()}
              </span>
            </div>
            <button onClick={() => navigate('/online')} className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl">
              Quit Game
            </button>
          </div>
        </div>
      </div>

      {(status === 'game_over' || status === 'disconnected') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-chess-card border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-sm p-10 text-center space-y-8">
            <Sparkles className={`w-10 h-10 mx-auto ${status === 'game_over' ? 'text-chess-green' : 'text-chess-secondary'}`} />
            <h2 className="text-3xl font-bold text-white">{status === 'disconnected' ? 'DISCONNECTED' : 'GAME OVER'}</h2>
            <p className="text-chess-green font-bold text-xl uppercase">{result?.replace('_', ' ')}</p>
            <button onClick={() => navigate('/online')} className="w-full py-4 bg-chess-green text-white font-bold rounded-xl text-lg">PLAY AGAIN</button>
            <button onClick={() => navigate('/')} className="w-full py-4 bg-zinc-700 text-white font-bold rounded-xl">BACK TO MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}
