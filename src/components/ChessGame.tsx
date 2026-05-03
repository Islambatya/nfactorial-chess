import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, LogOut, Sparkles, BrainCircuit, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const timeControls = [
  { name: 'Bullet', options: [1, 2], icon: '⚡' },
  { name: 'Blitz', options: [3, 5], icon: '🔥' },
  { name: 'Rapid', options: [10, 15, 30], icon: '🚀' },
  { name: 'Classic', options: [45, 60], icon: '🏆' },
];

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isGameSaved, setIsGameSaved] = useState(false);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  
  // Timer States
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnalysis = useCallback(async (pgn: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/analyze-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn }),
      });
      const data = await response.json();
      setCoachTip(data.analysis || data.detail);
      setShowCoachModal(true);
    } catch (err: any) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const saveGameResult = useCallback(async (gameInstance: Chess, reason: string) => {
    if (isGameSaved) return;
    setIsGameSaved(true);
    setIsGameOver(true);
    setGameOverReason(reason);
    if (timerRef.current) clearInterval(timerRef.current);
    handleAnalysis(gameInstance.pgn());
  }, [isGameSaved, handleAnalysis]);

  useEffect(() => {
    if (selectedTime && !isGameOver) {
      timerRef.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              saveGameResult(game, "White flagged (Time out)");
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              saveGameResult(game, "Black flagged (Time out)");
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedTime, game, isGameOver, saveGameResult]);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    if (isGameOver) return false;
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setFen(gameCopy.fen());
        if (gameCopy.isGameOver()) {
          let reason = "Game Over";
          if (gameCopy.isCheckmate()) reason = `Checkmate! ${gameCopy.turn() === 'w' ? 'Black' : 'White'} wins`;
          else if (gameCopy.isDraw()) reason = "Draw";
          saveGameResult(gameCopy, reason);
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, isGameOver, saveGameResult]);

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
  };

  const startWithTime = (minutes: number) => {
    setSelectedTime(minutes);
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    setIsGameOver(false);
    setGameOverReason(null);
    setIsGameSaved(false);
  };

  const resetGame = () => {
    setSelectedTime(null);
    setGame(new Chess());
    setFen('start');
    setIsGameOver(false);
    setGameOverReason(null);
    setIsGameSaved(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // 1. Time Selection Screen
  if (!selectedTime) {
    return (
      <div className="min-h-screen bg-[#262421] flex flex-col items-center justify-center p-6">
        <div className="absolute top-6 left-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-[#312e2b] text-white rounded-lg hover:bg-zinc-700 transition-all font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </button>
        </div>

        <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold text-white tracking-tight">New Game</h1>
            <p className="text-chess-secondary text-lg">Select time control</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timeControls.map((category) => (
              <div key={category.name} className="bg-[#312e2b] rounded-2xl p-6 border border-zinc-700/50 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">{category.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {category.options.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => startWithTime(mins)}
                      className="bg-[#262421] hover:bg-chess-green border border-zinc-700 hover:border-chess-green p-4 rounded-xl transition-all group active:scale-95"
                    >
                      <span className="text-2xl font-bold text-white block group-hover:scale-110 transition-transform">{mins} min</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Game Screen with Timers
  return (
    <div className="min-h-screen bg-[#262421] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button 
          onClick={resetGame}
          className="flex items-center gap-2 px-4 py-2 bg-[#312e2b] border border-zinc-700/50 text-white hover:bg-zinc-700 rounded-lg transition-all text-sm font-bold shadow-lg"
        >
          <RotateCcw className="w-4 h-4" />
          New Game
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-3 bg-[#312e2b] border border-zinc-700/50 rounded-lg pl-4 pr-2 py-2 shadow-lg">
          <div className="w-6 h-6 bg-[#81b64c] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
          <span className="text-sm text-white font-bold hidden sm:inline">{user?.email?.split('@')[0]}</span>
          <button 
            onClick={logout}
            className="p-1.5 hover:bg-zinc-700 rounded text-chess-secondary hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-4xl h-full py-8">
        {/* Opponent Timer (Black) */}
        <div className={`w-full max-w-[600px] flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all ${game.turn() === 'b' ? 'bg-[#312e2b] border-[#81b64c] shadow-[0_0_20px_rgba(129,182,76,0.2)]' : 'bg-zinc-800/20 border-transparent text-zinc-500'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-950 rounded-lg border border-zinc-700 flex items-center justify-center text-white font-bold">B</div>
            <span className="font-bold text-xl uppercase tracking-widest">Black</span>
          </div>
          <div className={`font-mono text-4xl font-bold ${blackTime < 10 && game.turn() === 'b' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(blackTime)}
          </div>
        </div>

        {/* Board */}
        <div className="w-full aspect-square max-h-[70vh] max-w-[600px] shadow-2xl relative">
          <Chessboard 
            options={{
              position: fen, 
              onPieceDrop: onDrop,
              boardOrientation: "white",
              darkSquareStyle: { backgroundColor: '#b58863' },
              lightSquareStyle: { backgroundColor: '#f0d9b5' },
              animationDurationInMs: 200,
            }}
          />
          {isGameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500 rounded-lg">
              <div className="bg-[#312e2b] border border-zinc-700 p-10 rounded-3xl shadow-2xl space-y-6 scale-110">
                <div className="w-20 h-20 bg-chess-bg rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-10 h-10 text-chess-green" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-white tracking-tight uppercase">Game Over</h2>
                  <p className="text-chess-green font-bold text-xl uppercase tracking-widest">{gameOverReason}</p>
                </div>
                <div className="grid gap-3 pt-4">
                  <button onClick={resetGame} className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg">PLAY AGAIN</button>
                  <button onClick={() => navigate('/')} className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all shadow-lg">BACK TO MENU</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Player Timer (White) */}
        <div className={`w-full max-w-[600px] flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all ${game.turn() === 'w' ? 'bg-[#312e2b] border-[#81b64c] shadow-[0_0_20px_rgba(129,182,76,0.2)]' : 'bg-zinc-800/20 border-transparent text-zinc-500'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-lg border border-zinc-700 flex items-center justify-center text-black font-bold">W</div>
            <span className="font-bold text-xl uppercase tracking-widest">White</span>
          </div>
          <div className={`font-mono text-4xl font-bold ${whiteTime < 10 && game.turn() === 'w' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(whiteTime)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 w-full max-w-[600px] justify-center">
          {isAnalyzing && (
            <div className="flex items-center gap-3 text-[#81b64c] font-bold animate-pulse bg-chess-input px-4 py-2 rounded-lg border border-zinc-700">
              <BrainCircuit className="w-5 h-5" />
              COACH ANALYZING...
            </div>
          )}
        </div>
      </div>

      {/* Coach Modal */}
      {showCoachModal && coachTip && !isGameOver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#312e2b] border border-[#81b64c]/30 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300">
            <button onClick={() => setShowCoachModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-800 transition-all">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#81b64c]/10 rounded-full flex items-center justify-center border border-[#81b64c]/20">
                <Sparkles className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-50">Coach Analysis</h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 italic text-zinc-300 text-lg leading-relaxed shadow-inner">
                {coachTip}
              </div>
              <button onClick={() => setShowCoachModal(false)} className="mt-6 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-full transition-all shadow-lg">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
