import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Auth from './Auth';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isGameSaved, setIsGameSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveGameResult = useCallback(async (gameInstance: Chess) => {
    if (!user || isGameSaved) return;

    const result = gameInstance.isCheckmate() 
      ? (gameInstance.turn() === 'w' ? 'Black wins' : 'White wins')
      : 'Draw';

    const { error } = await supabase.from('games').insert({
      user_id: user.id,
      result: result,
      pgn: gameInstance.pgn()
    });

    if (!error) {
      setIsGameSaved(true);
      console.log('Game saved successfully');
    } else {
      console.error('Error saving game:', error);
    }
  }, [user, isGameSaved]);

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

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    
    if (!move) return false;
    return true;
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setIsGameSaved(false);
  };

  const getGameStatus = () => {
    if (game.isCheckmate()) return "Checkmate! " + (game.turn() === 'w' ? "Black wins" : "White wins");
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return "Check!";
    return (game.turn() === 'w' ? "White" : "Black") + " to move";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4 relative">
      
      {/* Auth Button */}
      <div className="absolute top-4 right-4 z-10">
        {user ? (
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full pl-4 pr-2 py-1.5 shadow-lg">
            <span className="text-sm text-zinc-400 font-medium hidden sm:inline">{user.email}</span>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-full transition-all font-semibold shadow-lg hover:scale-105"
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>
        )}
      </div>

      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Chess</h1>
            <p className="text-zinc-400 mt-1">Play a local game</p>
          </div>
          <button 
            onClick={resetGame}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md transition-colors text-sm font-medium border border-zinc-700 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
          {isGameSaved && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
              Game Saved
            </span>
          )}
        </div>

        {/* Board Container */}
        <div className="w-full aspect-square max-w-[600px] mx-auto overflow-hidden rounded-md border-4 border-zinc-800 shadow-inner bg-zinc-800/20">
          <Chessboard 
            options={{
              position: fen, 
              onPieceDrop: onDrop,
              boardOrientation: "white",
              darkSquareStyle: { backgroundColor: '#3f3f46' },
              lightSquareStyle: { backgroundColor: '#a1a1aa' },
              animationDurationInMs: 200,
            }}
          />
        </div>
      </div>

      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
    </div>
  );
}
