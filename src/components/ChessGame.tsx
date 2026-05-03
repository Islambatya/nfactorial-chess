import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, LogOut, Sparkles, BrainCircuit, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isGameSaved, setIsGameSaved] = useState(false);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAnalysis = useCallback(async (pgn: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/analyze-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgn }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze game');
      }

      const data = await response.json();
      setCoachTip(data.analysis);
      setShowCoachModal(true);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setCoachTip(`AI Error: ${err.message}. Make sure backend is running!`);
      setShowCoachModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const saveGameResult = useCallback(async (gameInstance: Chess) => {
    if (isGameSaved) return;
    
    // We could save results to a local DB or backend here if needed
    // For now, we just trigger analysis as per requirement
    setIsGameSaved(true);
    handleAnalysis(gameInstance.pgn());
  }, [isGameSaved, handleAnalysis]);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setGame(gameCopy);
        setFen(gameCopy.fen());

        if (gameCopy.isGameOver()) {
          saveGameResult(gameCopy);
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, saveGameResult]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    
    return !!move;
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setIsGameSaved(false);
    setCoachTip(null);
    setShowCoachModal(false);
  };

  const getGameStatus = () => {
    if (game.isCheckmate()) return "Checkmate! " + (game.turn() === 'w' ? "Black wins" : "White wins");
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return "Check!";
    return (game.turn() === 'w' ? "White" : "Black") + " to move";
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-chess-bg p-4 relative overflow-y-auto pt-16 sm:pt-20">
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-chess-card border border-zinc-700/50 text-white hover:bg-zinc-700 rounded-lg transition-all text-sm font-bold shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Menu
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-3 bg-chess-card border border-zinc-700/50 rounded-lg pl-4 pr-2 py-2 shadow-lg">
          <div className="w-6 h-6 bg-chess-green rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
          <span className="text-sm text-white font-bold hidden sm:inline">{user?.email?.split('@')[0]}</span>
          <button 
            onClick={logout}
            className="p-1.5 hover:bg-zinc-700 rounded text-chess-secondary hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 pb-12">
        {/* Board Section */}
        <div className="space-y-6">
          <div className="w-full aspect-square max-w-[600px] mx-auto overflow-hidden rounded-lg shadow-2xl bg-chess-card">
            <Chessboard 
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation="white"
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={200}
              arePiecesDraggable={game.turn() === 'w'}
            />
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          <div className="bg-chess-card rounded-xl shadow-2xl p-6 border border-zinc-700/50 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Local Game</h1>
              <p className="text-chess-secondary text-sm">Practice Mode</p>
            </div>

            <div className="bg-chess-input rounded-lg p-4 border border-zinc-700/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}`} />
                  <span className="font-bold text-lg text-chess-green">
                    {getGameStatus()}
                  </span>
                </div>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-chess-green animate-pulse font-bold">
                  <BrainCircuit className="w-3 h-3" />
                  COACH IS THINKING...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={resetGame}
                className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-all font-bold shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                New Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCoachModal && coachTip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-chess-card border border-chess-green/30 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300">
            <button 
              onClick={() => setShowCoachModal(false)}
              className="absolute top-4 right-4 text-chess-secondary hover:text-white p-1 rounded-full hover:bg-zinc-700 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-chess-green/10 rounded-full flex items-center justify-center border border-chess-green/20">
                <Sparkles className="w-8 h-8 text-chess-green" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Coach's Advice</h2>
                <div className="bg-chess-input border border-zinc-700 rounded-xl p-6 italic text-white text-lg leading-relaxed shadow-inner">
                  "{coachTip}"
                </div>
              </div>
              <button 
                onClick={resetGame}
                className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
