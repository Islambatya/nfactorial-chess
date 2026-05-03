import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    emoji: '♟',
    description: 'The timeless original set',
    preview: ['♔', '♕', '♖', '♗', '♘', '♙'],
  },
  {
    id: 'neo',
    name: 'Neo',
    emoji: '🔷',
    description: 'Sleek modern minimalist design',
    preview: ['♔', '♕', '♖', '♗', '♘', '♙'],
  },
  {
    id: 'alpha',
    name: 'Alpha',
    emoji: '⚡',
    description: 'Bold high-contrast pieces',
    preview: ['♔', '♕', '♖', '♗', '♘', '♙'],
  },
  {
    id: 'california',
    name: 'California',
    emoji: '🌴',
    description: 'Warm, vibrant west-coast style',
    preview: ['♔', '♕', '♖', '♗', '♘', '♙'],
  },
];

const THEME_COLORS: Record<string, { bg: string; accent: string }> = {
  classic:    { bg: 'from-zinc-800 to-zinc-900',   accent: 'text-zinc-300' },
  neo:        { bg: 'from-blue-900 to-zinc-900',   accent: 'text-blue-400' },
  alpha:      { bg: 'from-yellow-900 to-zinc-900', accent: 'text-yellow-400' },
  california: { bg: 'from-orange-900 to-zinc-900', accent: 'text-orange-400' },
};

export default function PremiumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isPro, setIsPro] = useState(() => {
    if (!user) return false;
    return localStorage.getItem(`isPro_${user.username}`) === 'true';
  });
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (!user) return 'classic';
    return localStorage.getItem(`pieceTheme_${user.username}`) || 'classic';
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [selectedTheme]);

  const handleActivate = () => {
    if (!user) return;
    localStorage.setItem(`pieceTheme_${user.username}`, selectedTheme);
    window.dispatchEvent(new StorageEvent('storage', { key: `pieceTheme_${user.username}` }));
    setSaved(true);
  };

  const handleGetPro = () => {
    if (!user) return;
    localStorage.setItem(`isPro_${user.username}`, 'true');
    window.dispatchEvent(new StorageEvent('storage', { key: `isPro_${user.username}` }));
    setIsPro(true);
  };

  return (
    <div className="min-h-screen bg-[#262421] text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/menu')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Crown className="w-8 h-8 text-[#81b64c]" />
                Chess Premium 👑
              </h1>
              <p className="text-zinc-500 text-sm">Upgrade your game experience</p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-[#312e2b] border border-zinc-700 rounded-3xl p-8 flex flex-col shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-2">Free Plan</h2>
            <p className="text-zinc-500 mb-6">For casual players</p>
            <div className="text-4xl font-black mb-8">$0<span className="text-lg text-zinc-500 font-medium">/mo</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-[#81b64c]" /> Play vs Friend (local)
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-[#81b64c]" /> Play Online
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-[#81b64c]" /> Game History
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-[#81b64c]" /> 3 Daily Quiz Games
              </li>
              <li className="flex items-center gap-3 text-zinc-600">
                <X className="w-5 h-5" /> Custom Piece Themes
              </li>
              <li className="flex items-center gap-3 text-zinc-600">
                <X className="w-5 h-5" /> Brutal AI Coach
              </li>
            </ul>
            
            <button disabled className="w-full py-4 bg-zinc-800 text-zinc-500 font-bold rounded-xl transition-all border border-zinc-700 cursor-not-allowed">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-[#312e2b] to-zinc-900 border-2 border-[#81b64c] rounded-3xl p-8 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#81b64c] text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-bl-lg">
              Most Popular
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">Pro Plan <Crown className="w-5 h-5 text-[#81b64c]" /></h2>
            <p className="text-zinc-400 mb-6">For serious improvers</p>
            <div className="text-4xl font-black mb-8 text-[#81b64c]">$4.99<span className="text-lg text-zinc-500 font-medium">/mo</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-[#81b64c]" /> Everything in Free
              </li>
              <li className="flex items-center gap-3 text-white font-bold">
                <Check className="w-5 h-5 text-[#81b64c]" /> 4 Custom Piece Themes
              </li>
              <li className="flex items-center gap-3 text-white font-bold">
                <Check className="w-5 h-5 text-[#81b64c]" /> Brutal AI Coach Analysis
              </li>
              <li className="flex items-center gap-3 text-white font-bold">
                <Check className="w-5 h-5 text-[#81b64c]" /> Unlimited Quiz Chess
              </li>
            </ul>
            
            {isPro ? (
              <button disabled className="w-full py-4 bg-zinc-800 text-[#81b64c] font-bold rounded-xl transition-all border border-[#81b64c]/50 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Pro Active
              </button>
            ) : (
              <button onClick={handleGetPro} className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(129,182,76,0.5)]">
                Get Pro
              </button>
            )}
          </div>
        </div>

        {/* Theme Grid (Only interactive if Pro) */}
        <div className={`space-y-6 ${!isPro ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">Custom Themes {isPro ? '' : <span className="text-sm font-normal text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Pro Required</span>}</h2>
            <p className="text-zinc-500 text-sm">Stand out on the board</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              const colors = THEME_COLORS[theme.id];
              return (
                <button
                  key={theme.id}
                  onClick={() => isPro && setSelectedTheme(theme.id)}
                  className={`relative text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xl group ${
                    isSelected
                      ? 'border-[#81b64c] shadow-[0_0_20px_rgba(129,182,76,0.25)]'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <div className={`bg-gradient-to-br ${colors.bg} p-6 space-y-4`}>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-[#81b64c] rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="bg-black/20 rounded-xl p-4 flex justify-center gap-1">
                      {theme.id === 'classic' ? (
                        <div className="flex gap-1">
                          {theme.preview.map((p, i) => (
                            <span key={i} className={`text-3xl ${colors.accent}`}>{p}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          {['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'].map((piece) => (
                            <img
                              key={piece}
                              src={`https://www.chess.com/chess-themes/pieces/${theme.id}/150/${piece}.png`}
                              alt={piece}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{theme.emoji}</span>
                        <h3 className="text-xl font-bold text-white">{theme.name}</h3>
                      </div>
                      <p className="text-zinc-400 text-sm mt-1">{theme.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between bg-[#312e2b] rounded-2xl p-6 border border-zinc-700/50 shadow-xl">
            <div>
              <p className="text-white font-bold text-lg">
                Selected: <span className="text-[#81b64c]">{THEMES.find(t => t.id === selectedTheme)?.name}</span>
              </p>
              <p className="text-zinc-500 text-sm">Will apply to your next local game</p>
            </div>
            <button
              onClick={handleActivate}
              disabled={!isPro}
              className={`px-8 py-3 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                saved
                  ? 'bg-zinc-700 text-[#81b64c] border border-[#81b64c]/50'
                  : 'bg-[#81b64c] hover:brightness-110 text-white'
              }`}
            >
              {saved ? (
                <><Check className="w-4 h-4" /> Activated!</>
              ) : (
                <>👑 Activate</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
