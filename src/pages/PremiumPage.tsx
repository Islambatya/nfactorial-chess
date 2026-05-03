import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown } from 'lucide-react';

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
  const [selectedTheme, setSelectedTheme] = useState(
    () => localStorage.getItem('pieceTheme') || 'classic'
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [selectedTheme]);

  const handleActivate = () => {
    localStorage.setItem('pieceTheme', selectedTheme);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-[#262421] text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

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
                Premium Themes 👑
              </h1>
              <p className="text-zinc-500 text-sm">Choose your piece style</p>
            </div>
          </div>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            const colors = THEME_COLORS[theme.id];
            return (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xl group ${
                  isSelected
                    ? 'border-[#81b64c] shadow-[0_0_20px_rgba(129,182,76,0.25)]'
                    : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {/* Card background */}
                <div className={`bg-gradient-to-br ${colors.bg} p-6 space-y-4`}>
                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-[#81b64c] rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Piece preview */}
                  <div className="bg-black/20 rounded-xl p-4 flex justify-center gap-1">
                    {theme.id === 'classic' ? (
                      /* Unicode pieces for classic */
                      <div className="flex gap-1">
                        {theme.preview.map((p, i) => (
                          <span key={i} className={`text-3xl ${colors.accent}`}>{p}</span>
                        ))}
                      </div>
                    ) : (
                      /* Image previews from chess.com CDN */
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

                  {/* Theme info */}
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

        {/* Activate button */}
        <div className="flex items-center justify-between bg-[#312e2b] rounded-2xl p-6 border border-zinc-700/50 shadow-xl">
          <div>
            <p className="text-white font-bold text-lg">
              Selected: <span className="text-[#81b64c]">{THEMES.find(t => t.id === selectedTheme)?.name}</span>
            </p>
            <p className="text-zinc-500 text-sm">Will apply to your next local game</p>
          </div>
          <button
            onClick={handleActivate}
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
  );
}
