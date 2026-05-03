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
  
  // New States
  const [whiteName, setWhiteName] = useState('Player 1');
  const [blackName, setBlackName] = useState('Player 2');
  const [gameStarted, setGameStarted] = useState(false);

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
        setGameStarted(true);

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
    return move;
  };

  const handleNewGame = () => {
    setGame(new Chess());
    setFen('start');
    setIsGameSaved(false);
    setCoachTip(null);
    setShowCoachModal(false);
    setGameStarted(false); // Reset game started state
  };

  const getGameStatus = () => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? blackName : whiteName;
      return `${winner} wins by Checkmate!`;
    }
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return "Check!";
    return (game.turn() === 'w' ? whiteName : blackName) + "'s turn";
  };

  // Use the same hack as OnlineGame.tsx to avoid TS errors with react-chessboard v5
  const AnyChessboard = Chessboard as any;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-950 p-4 relative overflow-y-auto pt-16 sm:pt-20 text-white">
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full transition-all text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Menu
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full pl-4 pr-2 py-1.5 shadow-lg">
          <span className="text-sm text-zinc-400 font-medium hidden sm:inline">{user?.email}</span>
          <button 
            onClick={logout}
            className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full flex flex-col lg:flex-row gap-8 pb-12 items-start justify-center">
        {/* Board Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 flex-1 w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Chess Game</h1>
            <button 
              onClick={handleNewGame}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md transition-colors text-sm font-medium border border-zinc-700 hover:border-zinc-600"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          </div>

          <div className="w-full aspect-square max-w-[500px] mx-auto overflow-hidden rounded-md border-4 border-zinc-800 shadow-inner bg-zinc-800/20">
            <AnyChessboard 
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation="white"
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={200}
            />
          </div>
        </div>

        {/* Sidebar / Players */}
        <div className="w-full lg:w-[320px] space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-xl">
            {/* Player 2 (Black) */}
            <div className="flex flex-col items-center gap-4 py-4 border-b border-zinc-800">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold border border-zinc-700 shadow-inner">B</div>
              <input
                value={blackName}
                onChange={(e) => setBlackName(e.target.value)}
                disabled={gameStarted}
                className="bg-transparent border-none border-b border-zinc-700 text-white text-xs text-center w-[100px] outline-none font-bold uppercase tracking-widest focus:border-[#81b64c] transition-all disabled:opacity-50"
                placeholder="Player 2"
              />
            </div>

            {/* Game Status */}
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 flex flex-col items-center gap-3">
              <span className="font-bold text-center text-zinc-200">
                {getGameStatus()}
              </span>
              {isAnalyzing && (
                <span className="flex items-center gap-2 text-xs text-purple-400 animate-pulse">
                  <BrainCircuit className="w-3 h-3" />
                  AI thinking...
                </span>
              )}
            </div>

            {/* Player 1 (White) */}
            <div className="flex flex-col items-center gap-4 py-4 border-t border-zinc-800">
              <input
                value={whiteName}
                onChange={(e) => setWhiteName(e.target.value)}
                disabled={gameStarted}
                className="bg-transparent border-none border-b border-zinc-700 text-white text-xs text-center w-[100px] outline-none font-bold uppercase tracking-widest focus:border-[#81b64c] transition-all disabled:opacity-50"
                placeholder="Player 1"
              />
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-2xl font-bold border border-zinc-700 text-zinc-900 shadow-lg">W</div>
            </div>
          </div>
        </div>
      </div>

      {showCoachModal && coachTip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300">
            <button 
              onClick={() => setShowCoachModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-800 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-50">Coach Analysis</h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 italic text-zinc-300 text-lg leading-relaxed shadow-inner">
                {coachTip}
              </div>
              <button 
                onClick={handleNewGame}
                className="mt-6 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-full transition-all shadow-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
