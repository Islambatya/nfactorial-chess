import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, BrainCircuit, X, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { name: 'Bullet', icon: '🚀', options: [1, 2] },
  { name: 'Blitz', icon: '⚡', options: [3, 5] },
  { name: 'Rapid', icon: '🏃', options: [10, 15, 30] },
  { name: 'Classical', icon: '♟', options: [45, 60] },
];

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isGameSaved, setIsGameSaved] = useState(false);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  
  // Player Names
  const [whiteName, setWhiteName] = useState('Player 1');
  const [blackName, setBlackName] = useState('Player 2');
  
  // Timer States
  const [tempSelectedTime, setTempSelectedTime] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveGameToHistory = useCallback((gameInstance: Chess, result: string, reason: string) => {
    const gameRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      timeControl: selectedTime + " min",
      result: result,
      reason: reason,
      moves: moveHistory,
      pgn: gameInstance.pgn()
    };
    const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
    history.unshift(gameRecord);
    localStorage.setItem('gameHistory', JSON.stringify(history));
  }, [selectedTime, moveHistory]);

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
      setCoachTip("AI Analysis failed. Make sure the backend is running.");
      setShowCoachModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const finishGame = useCallback((gameInstance: Chess, gameWinner: string, reason: string) => {
    if (isGameSaved) return;
    setIsGameSaved(true);
    setIsGameOver(true);
    setWinner(gameWinner);
    setGameOverReason(reason);
    if (timerRef.current) clearInterval(timerRef.current);
    
    let resultString = "";
    if (gameWinner === 'Draw') {
      resultString = 'Draw';
    } else {
      const winnerName = gameWinner === 'White' ? whiteName : blackName;
      resultString = `${winnerName} wins`;
    }
    saveGameToHistory(gameInstance, resultString, reason);
  }, [isGameSaved, saveGameToHistory, whiteName, blackName]);

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
        setMoveHistory(prev => [...prev, result.san]);

        if (gameCopy.isGameOver()) {
          let reason = "Game Over";
          let gameWinner = "Draw";
          
          if (gameCopy.isCheckmate()) {
            reason = "by Checkmate";
            gameWinner = gameCopy.turn() === 'w' ? 'Black' : 'White';
          } else if (gameCopy.isDraw()) {
            reason = "Draw";
            gameWinner = "Draw";
          }
          finishGame(gameCopy, gameWinner, reason);
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
    setGameOverReason(null);
    setWinner(null);
    setIsGameSaved(false);
    setMoveHistory([]);
  };

  const resetGame = () => {
    setSelectedTime(null);
    setTempSelectedTime(null);
    setGame(new Chess());
    setFen('start');
    setMoveHistory([]);
    setIsGameOver(false);
    setGameOverReason(null);
    setWinner(null);
    setIsGameSaved(false);
    setWhiteTime(0);
    setBlackTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resign = () => {
    const gameWinner = game.turn() === 'w' ? 'Black' : 'White';
    finishGame(game, gameWinner, "by Resignation");
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#262421] text-white overflow-hidden">
      {/* Main Board Area */}
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
                    {winner === 'Draw' ? 'Draw!' : `${winner === 'White' ? whiteName : blackName} Wins! ${winner === 'White' ? '♔' : '♚'}`}
                  </h2>
                  <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest">{gameOverReason}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleAnalysis(game.pgn())} 
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <BrainCircuit className="w-5 h-5 text-[#81b64c]" />
                    🤖 AI Analysis
                  </button>
                  <button 
                    onClick={resetGame} 
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
          /* Selection View */
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Sidebar Header - Editable Names */}
            <div className="flex items-center justify-around py-8 border-b border-zinc-800 bg-[#2c2c2c]/30">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-[#2c2c2c] rounded-full flex items-center justify-center text-xl font-bold border border-zinc-700 shadow-inner">W</div>
                <input
                  value={whiteName}
                  onChange={(e) => setWhiteName(e.target.value)}
                  className="bg-transparent border-none border-b border-[#4a4a4a] text-white text-[12px] text-center w-[100px] outline-none font-bold uppercase tracking-widest focus:border-[#81b64c] transition-colors"
                  placeholder="Player 1"
                />
              </div>
              <div className="text-zinc-800 font-black text-xl italic tracking-tighter opacity-50">VS</div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-[#2c2c2c] rounded-full flex items-center justify-center text-xl font-bold border border-zinc-700 shadow-inner">B</div>
                <input
                  value={blackName}
                  onChange={(e) => setBlackName(e.target.value)}
                  className="bg-transparent border-none border-b border-[#4a4a4a] text-white text-[12px] text-center w-[100px] outline-none font-bold uppercase tracking-widest focus:border-[#81b64c] transition-colors"
                  placeholder="Player 2"
                />
              </div>
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

            <div className="p-6 border-t border-zinc-800 bg-[#2c2c2c]/20">
              <button
                onClick={startWithTime}
                disabled={!tempSelectedTime}
                className={`w-full py-4 text-white font-bold text-base rounded-md transition-all shadow-lg active:scale-[0.98] uppercase tracking-wider ${
                  tempSelectedTime ? 'bg-[#81b64c] hover:brightness-110' : 'bg-[#4a4a4a] cursor-not-allowed opacity-50'
                }`}
              >
                Start Game
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full mt-4 py-2 text-zinc-600 hover:text-zinc-400 text-[11px] font-black uppercase tracking-[0.2em] transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        ) : (
          /* Active Game View */
          <div className="flex flex-col h-full p-6 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col space-y-6 flex-1">
              {/* Black Player */}
              <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'b' ? 'bg-[#262421] border-[#81b64c] shadow-[0_0_30px_rgba(129,182,76,0.1)]' : 'bg-transparent border-transparent opacity-60'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#2c2c2c] rounded-xl flex items-center justify-center border border-zinc-700 text-white font-bold text-xl shadow-inner">B</div>
                  <div>
                    <p className="font-bold text-lg">{blackName}</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Black</p>
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
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-700 text-black font-bold text-xl shadow-lg">W</div>
                  <div>
                    <p className="font-bold text-lg">{whiteName}</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">White</p>
                  </div>
                </div>
                <div className={`text-5xl font-mono font-bold text-center ${whiteTime < 10 && game.turn() === 'w' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>

              {/* Status / Coach / Moves */}
              <div className="pt-4 space-y-3 overflow-hidden flex flex-col min-h-0">
                <div className="bg-[#2c2c2c] p-4 rounded-xl border border-zinc-800 flex items-center justify-center gap-3">
                  <BrainCircuit className={`w-5 h-5 ${isAnalyzing ? 'text-[#81b64c] animate-pulse' : 'text-zinc-600'}`} />
                  <span className={`font-bold uppercase tracking-widest text-xs ${isAnalyzing ? 'text-[#81b64c]' : 'text-zinc-500'}`}>
                    {isAnalyzing ? 'Coach thinking...' : 'Coach advice ready'}
                  </span>
                </div>
                {coachTip && (
                  <button onClick={() => setShowCoachModal(true)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-all border border-zinc-700">
                    View Advice
                  </button>
                )}
                
                {/* Move History Mini List */}
                <div className="flex-1 overflow-y-auto bg-[#262421]/50 rounded-xl p-4 border border-zinc-800/50">
                  <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-3">Move History</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {moveHistory.reduce((acc: any[], move, i) => {
                      if (i % 2 === 0) acc.push([move]);
                      else acc[acc.length - 1].push(move);
                      return acc;
                    }, []).map((pair, i) => (
                      <div key={i} className="flex gap-2 text-xs font-mono">
                        <span className="text-zinc-600 w-4">{i + 1}.</span>
                        <span className="text-zinc-300 flex-1">{pair[0]}</span>
                        <span className="text-zinc-300 flex-1">{pair[1] || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <button 
                onClick={resign}
                className="w-full py-4 bg-[#2c2c2c] hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-[#4a4a4a] hover:border-red-900/50 rounded-md transition-all font-bold flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Resign
              </button>
              <button 
                onClick={resetGame}
                className="w-full py-3 text-zinc-600 hover:text-zinc-400 text-[11px] font-black uppercase tracking-widest transition-colors"
              >
                New Game
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
