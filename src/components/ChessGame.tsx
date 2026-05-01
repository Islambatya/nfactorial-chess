import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw } from 'lucide-react';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  // We use this to force re-render when game state changes
  const [fen, setFen] = useState(game.fen());

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      // make a copy to ensure state update
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setGame(gameCopy);
        setFen(gameCopy.fen());
        return true;
      }
    } catch (e) {
      // Invalid move
      return false;
    }
    return false;
  }, [game]);

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // always promote to queen for simplicity
    });
    
    // illegal move
    if (!move) return false;
    return true;
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
  };

  const getGameStatus = () => {
    if (game.isCheckmate()) return "Checkmate! " + (game.turn() === 'w' ? "Black wins" : "White wins");
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return "Check!";
    return (game.turn() === 'w' ? "White" : "Black") + " to move";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4">
      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Chess</h1>
            <p className="text-zinc-400 mt-1">Play a local game</p>
          </div>
          <button 
            onClick={resetGame}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md transition-colors text-sm font-medium border border-zinc-700 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-zinc-200' : 'bg-zinc-600'}`} />
            <span className="font-semibold text-lg text-zinc-200">
              {getGameStatus()}
            </span>
          </div>
        </div>

        {/* Board Container */}
        <div className="w-full aspect-square max-w-[600px] mx-auto overflow-hidden rounded-md border-4 border-zinc-800 shadow-inner bg-zinc-800/20">
          <Chessboard 
            options={{
              position: fen, 
              onPieceDrop: onDrop,
              boardOrientation: "white",
              darkSquareStyle: { backgroundColor: '#3f3f46' }, // zinc-700
              lightSquareStyle: { backgroundColor: '#a1a1aa' }, // zinc-400
              animationDurationInMs: 200,
            }}
          />
        </div>

      </div>
    </div>
  );
}
