import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles, BrainCircuit, X, Trash2 } from 'lucide-react';
import { getApiUrl } from '../lib/api';

interface GameRecord {
  id: number;
  date: string;
  timeControl: string;
  result: string;
  reason: string;
  moves: string[];
  pgn: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('gameHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const handleAnalyze = async (game: GameRecord) => {
    setSelectedGame(game);
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch(`${getApiUrl()}/analyze-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: game.pgn }),
      });
      const data = await response.json();
      setAnalysis(data.analysis || data.detail);
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysis("Failed to connect to the analysis engine. Please make sure the backend is running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all game history?")) {
      localStorage.removeItem('gameHistory');
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#262421] text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Clock className="w-8 h-8 text-[#81b64c]" />
                Game History
              </h1>
              <p className="text-zinc-500 text-sm">Review and analyze your past performances</p>
            </div>
          </div>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-[#312e2b] rounded-2xl p-12 text-center space-y-4 border border-zinc-800 shadow-xl">
            <div className="w-20 h-20 bg-[#262421] rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-bold">No games yet</h2>
            <p className="text-zinc-500">Play your first game to see it here!</p>
            <button 
              onClick={() => navigate('/game')}
              className="mt-4 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              Play Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((game) => (
              <div key={game.id} className="bg-[#312e2b] rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                    game.result.includes('White') ? 'bg-white text-black' : 'bg-zinc-950 text-white border border-zinc-800'
                  }`}>
                    {game.result.includes('White') ? 'W' : 'B'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{game.result}</span>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase rounded tracking-widest">{game.timeControl}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <span>{game.reason}</span>
                      <span>•</span>
                      <span>{new Date(game.date).toLocaleDateString()} {new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleAnalyze(game)}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-zinc-800 hover:bg-[#81b64c] text-zinc-300 hover:text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-zinc-700 hover:border-[#81b64c]"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Modal */}
      {(selectedGame || isAnalyzing) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#312e2b] border border-[#81b64c]/30 rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in zoom-in duration-300 my-8">
            <button 
              onClick={() => { setSelectedGame(null); setAnalysis(null); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-800 transition-all z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#81b64c]/10 rounded-full flex items-center justify-center border border-[#81b64c]/20">
                  <Sparkles className="w-6 h-6 text-[#81b64c]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Game Analysis</h2>
                  <p className="text-zinc-500 text-sm">Tactical review by AI Coach</p>
                </div>
              </div>

              <div className="bg-[#262421] border border-zinc-800 rounded-xl p-6 min-h-[200px] relative overflow-hidden">
                {isAnalyzing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                    <BrainCircuit className="w-12 h-12 text-[#81b64c] animate-pulse" />
                    <p className="text-[#81b64c] font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Processing moves...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="italic text-zinc-300 text-lg leading-relaxed">
                      {analysis}
                    </div>
                    {selectedGame && (
                      <div className="pt-4 border-t border-zinc-800">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Move Sequence</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGame.moves.map((move, idx) => (
                            <span key={idx} className="px-2 py-1 bg-zinc-800 rounded text-[11px] font-mono text-zinc-300">
                              {idx % 2 === 0 ? `${Math.floor(idx/2) + 1}.` : ''} {move}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => { setSelectedGame(null); setAnalysis(null); }}
                  className="px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
