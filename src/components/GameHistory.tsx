import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { History, Trophy, Minus } from 'lucide-react';

interface Game {
  id: string;
  created_at: string;
  result: string;
  pgn: string;
}

export default function GameHistory({ userId }: { userId: string }) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setGames(data);
      }
      setLoading(false);
    }

    fetchGames();
  }, [userId]);

  if (loading) return <div className="text-zinc-500 animate-pulse text-sm">Loading history...</div>;
  if (games.length === 0) return null;

  return (
    <div className="w-full mt-8 space-y-4">
      <div className="flex items-center gap-2 text-zinc-100 font-semibold border-b border-zinc-800 pb-2">
        <History className="w-4 h-4" />
        <h3>My Last Games</h3>
      </div>
      <div className="grid gap-2">
        {games.map((game) => (
          <div key={game.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                game.result.includes('wins') ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-400'
              }`}>
                {game.result.includes('wins') ? <Trophy className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">{game.result}</p>
                <p className="text-xs text-zinc-500">{new Date(game.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-zinc-600 truncate max-w-[150px]">{game.pgn}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
