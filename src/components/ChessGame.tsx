import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, BrainCircuit, X, ArrowLeft, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { name: 'Пуля', icon: '🚀', options: [1, 2] },
  { name: 'Блиц', icon: '⚡', options: [3, 5] },
  { name: 'Рапид', icon: '🏃', options: [10, 15, 30] },
  { name: 'Классика', icon: '♟', options: [45, 60] },
];

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isGameSaved, setIsGameSaved] = useState(false);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  
  // Timer States
  const [tempSelectedTime, setTempSelectedTime] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
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
              saveGameResult(game, "Белые просрочили время");
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              saveGameResult(game, "Черные просрочили время");
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
          let reason = "Игра окончена";
          if (gameCopy.isCheckmate()) reason = `Мат! Победили ${gameCopy.turn() === 'w' ? 'Черные' : 'Белые'}`;
          else if (gameCopy.isDraw()) reason = "Ничья";
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

  const startWithTime = () => {
    if (!tempSelectedTime) return;
    setSelectedTime(tempSelectedTime);
    setWhiteTime(tempSelectedTime * 60);
    setBlackTime(tempSelectedTime * 60);
    setIsGameOver(false);
    setGameOverReason(null);
    setIsGameSaved(false);
  };

  const resetGame = () => {
    setSelectedTime(null);
    setTempSelectedTime(null);
    setGame(new Chess());
    setFen('start');
    setIsGameOver(false);
    setGameOverReason(null);
    setIsGameSaved(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resign = () => {
    const winner = game.turn() === 'w' ? 'Черные' : 'Белые';
    saveGameResult(game, `${winner} победили (сдача)`);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#262421] text-white">
      {/* Sidebar Overlay (Mobile) */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <button onClick={() => navigate('/')} className="p-2 bg-[#312e2b] rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[800px] aspect-square relative shadow-2xl">
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 rounded-lg animate-in fade-in duration-500">
              <div className="bg-[#312e2b] border border-zinc-700 p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="w-16 h-16 bg-[#262421] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8 text-[#81b64c]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold uppercase tracking-tight">Игра окончена</h2>
                  <p className="text-[#81b64c] font-bold text-lg uppercase tracking-wider">{gameOverReason}</p>
                </div>
                <button onClick={resetGame} className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg">Новая игра</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[400px] bg-[#312e2b] flex flex-col border-l border-zinc-800 shadow-2xl overflow-y-auto">
        {!selectedTime ? (
          /* Selection View */
          <div className="flex flex-col h-full p-6 space-y-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Локальная игра</h1>
              <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase text-xs tracking-[0.2em]">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTempSelectedTime(mins)}
                        className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all ${
                          tempSelectedTime === mins 
                          ? 'bg-[#1a1a1a] border-2 border-[#81b64c] text-[#81b64c]' 
                          : 'bg-[#1a1a1a] border-2 border-transparent text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {mins} мин
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startWithTime}
              disabled={!tempSelectedTime}
              className="w-full py-5 bg-[#81b64c] hover:brightness-110 disabled:opacity-50 disabled:grayscale text-white font-black text-xl rounded-xl transition-all shadow-lg active:scale-[0.98]"
            >
              Начать игру
            </button>
          </div>
        ) : (
          /* Active Game View */
          <div className="flex flex-col h-full p-6 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col space-y-6 flex-1">
              {/* Black Player */}
              <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'b' ? 'bg-[#262421] border-[#81b64c] shadow-[0_0_30px_rgba(129,182,76,0.1)]' : 'bg-transparent border-transparent opacity-60'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-700 text-white font-bold text-xl">Ч</div>
                  <div>
                    <p className="font-bold text-lg">Черные</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Противник</p>
                  </div>
                </div>
                <div className={`text-5xl font-mono font-bold text-center ${blackTime < 10 && game.turn() === 'b' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(blackTime)}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800"></span>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#312e2b] px-4 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">VS</span>
                </div>
              </div>

              {/* White Player */}
              <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'w' ? 'bg-[#262421] border-[#81b64c] shadow-[0_0_30px_rgba(129,182,76,0.1)]' : 'bg-transparent border-transparent opacity-60'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-700 text-black font-bold text-xl">Б</div>
                  <div>
                    <p className="font-bold text-lg">Белые</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Вы</p>
                  </div>
                </div>
                <div className={`text-5xl font-mono font-bold text-center ${whiteTime < 10 && game.turn() === 'w' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>

              {/* Status / Coach */}
              <div className="pt-4 space-y-3">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-zinc-800 flex items-center justify-center gap-3">
                  <BrainCircuit className={`w-5 h-5 ${isAnalyzing ? 'text-[#81b64c] animate-pulse' : 'text-zinc-600'}`} />
                  <span className={`font-bold uppercase tracking-widest text-xs ${isAnalyzing ? 'text-[#81b64c]' : 'text-zinc-500'}`}>
                    {isAnalyzing ? 'Тренер думает...' : 'Совет тренера готов'}
                  </span>
                </div>
                {coachTip && (
                  <button onClick={() => setShowCoachModal(true)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-all">
                    Посмотреть совет
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <button 
                onClick={resign}
                className="w-full py-4 bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-900/50 rounded-xl transition-all font-bold flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Сдаться
              </button>
              <button 
                onClick={resetGame}
                className="w-full py-3 text-zinc-600 hover:text-zinc-400 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Новая партия
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coach Modal */}
      {showCoachModal && coachTip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#312e2b] border border-[#81b64c]/30 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300">
            <button onClick={() => setShowCoachModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-800 transition-all">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#81b64c]/10 rounded-full flex items-center justify-center border border-[#81b64c]/20">
                <Sparkles className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-50">Анализ тренера</h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 italic text-zinc-300 text-lg leading-relaxed shadow-inner">
                {coachTip}
              </div>
              <button onClick={() => setShowCoachModal(false)} className="mt-6 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg">Продолжить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
