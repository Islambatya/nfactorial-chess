import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, BrainCircuit, X, Flag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { name: 'Bullet', icon: '🚀', options: [1, 2] },
  { name: 'Blitz', icon: '⚡', options: [3, 5] },
  { name: 'Rapid', icon: '🏃', options: [10, 15] },
  { name: 'Classical', icon: '♟', options: [30, 45] },
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
  const [winner, setWinner] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  
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
      setCoachTip("Analysis failed. Check backend.");
      setShowCoachModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const finishGame = useCallback((gameInstance: Chess, gameWinner: string, gameReason: string) => {
    if (isGameOver) return;
    setIsGameOver(true);
    setWinner(gameWinner);
    setReason(gameReason);
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (!isGameSaved) {
      setIsGameSaved(true);
      handleAnalysis(gameInstance.pgn());
    }
  }, [isGameOver, isGameSaved, handleAnalysis]);

  useEffect(() => {
    if (selectedTime && !isGameOver) {
      timerRef.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              finishGame(game, "Black", "on Time");
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              finishGame(game, "White", "on Time");
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
  }, [selectedTime, game, isGameOver, finishGame]);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    if (isGameOver) return false;
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setFen(gameCopy.fen());

        if (gameCopy.isGameOver()) {
          let gameReason = "Game Over";
          let gameWinner = "Draw";
          if (gameCopy.isCheckmate()) {
            gameReason = "by Checkmate";
            gameWinner = gameCopy.turn() === 'w' ? 'Black' : 'White';
          } else if (gameCopy.isDraw()) {
            gameReason = "Draw";
            gameWinner = "Draw";
          }
          finishGame(gameCopy, gameWinner, gameReason);
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, isGameOver, finishGame]);

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
    setWinner(null);
    setReason(null);
    setIsGameSaved(false);
  };

  const handleNewGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setIsGameOver(false);
    setReason(null);
    setWinner(null);
    setIsGameSaved(false);
    setWhiteTime(0);
    setBlackTime(0);
    setSelectedTime(null);
    setTempSelectedTime(null);
    setCoachTip(null);
    setShowCoachModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#262421] text-white overflow-hidden">
      {/* Board Area */}
      <div className="flex-1 h-full flex items-center justify-center p-4">
        <div className="w-full max-w-[calc(100vh-40px)] aspect-square relative shadow-2xl">
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
          
          {/* End Game Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 rounded-lg animate-in fade-in duration-500">
              <div className="bg-[#312e2b] border border-zinc-700 p-10 rounded-3xl shadow-2xl space-y-8 scale-110">
                <div className="w-20 h-20 bg-[#262421] rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-zinc-800">
                  <Sparkles className="w-10 h-10 text-[#81b64c]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold uppercase tracking-tight text-white">
                    {winner === 'Draw' ? 'Draw!' : `${winner} Wins!`}
                  </h2>
                  <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest">{reason}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleAnalysis(game.pgn())} 
                    disabled={isAnalyzing}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50"
                  >
                    <BrainCircuit className={`w-5 h-5 ${isAnalyzing ? 'animate-pulse text-[#81b64c]' : 'text-[#81b64c]'}`} />
                    {isAnalyzing ? 'Analyzing...' : '🤖 AI Analysis'}
                  </button>
                  <button 
                    onClick={handleNewGame} 
                    className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
                  >
                    New Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[400px] bg-[#312e2b] flex flex-col border-l border-zinc-800 shadow-2xl">
        {!selectedTime ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-xl font-bold tracking-tight">Time Control</h2>
              <p className="text-zinc-500 text-sm mt-1">Select a game mode</p>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 font-black uppercase text-[11px] tracking-[0.2em]">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTempSelectedTime(mins)}
                        className={`min-w-[80px] px-5 py-2.5 rounded-md text-sm font-semibold transition-all border ${
                          tempSelectedTime === mins 
                          ? 'bg-[#81b64c] border-[#81b64c] text-white shadow-lg' 
                          : 'bg-[#2c2c2c] border-[#4a4a4a] text-white hover:border-[#81b64c]'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-zinc-800">
              <button
                onClick={startWithTime}
                disabled={!tempSelectedTime}
                className={`w-full py-4 text-white font-bold text-base rounded-md transition-all shadow-lg uppercase tracking-wider ${
                  tempSelectedTime ? 'bg-[#81b64c] hover:brightness-110' : 'bg-[#4a4a4a] cursor-not-allowed opacity-50'
                }`}
              >
                Start Game
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full mt-4 py-2 text-zinc-600 hover:text-zinc-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Menu
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-8 animate-in slide-in-from-right duration-300 space-y-12">
            {/* Black Timer */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'b' ? 'bg-[#262421] border-[#81b64c]' : 'bg-transparent border-transparent opacity-40'}`}>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Black</p>
              <div className={`text-6xl font-mono font-bold text-center ${blackTime < 10 && game.turn() === 'b' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(blackTime)}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-full h-px bg-zinc-800"></div>
              <span className="text-zinc-700 font-black italic">VS</span>
              <div className="w-full h-px bg-zinc-800"></div>
            </div>

            {/* White Timer */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'w' ? 'bg-[#262421] border-[#81b64c]' : 'bg-transparent border-transparent opacity-40'}`}>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">White</p>
              <div className={`text-6xl font-mono font-bold text-center ${whiteTime < 10 && game.turn() === 'w' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(whiteTime)}
              </div>
            </div>

            <div className="pt-8">
              <button 
                onClick={handleNewGame}
                className="w-full py-4 bg-[#2c2c2c] hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-[#4a4a4a] hover:border-red-900/50 rounded-md transition-all font-bold flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Resign
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
              <h2 className="text-2xl font-bold text-zinc-50">Coach Analysis</h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 italic text-zinc-300 text-lg leading-relaxed shadow-inner">
                {coachTip}
              </div>
              <button onClick={() => setShowCoachModal(false)} className="mt-6 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
