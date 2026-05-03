import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Globe, LogOut } from 'lucide-react';

export default function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col items-center justify-center p-4 relative">
      {/* Header */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <div className="flex items-center gap-3 bg-chess-card border border-zinc-700/50 rounded-full px-4 py-2 shadow-lg">
          <div className="w-8 h-8 bg-chess-green rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.email?.[0].toUpperCase()}
          </div>
          <span className="text-sm text-white font-medium">{user?.email?.split('@')[0]}</span>
          <button
            onClick={logout}
            className="p-1.5 text-chess-secondary hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl text-center space-y-12">
        <div>
          <h1 className="text-6xl font-bold text-white tracking-tight mb-4 flex items-center justify-center gap-4">
            <span className="text-7xl">♟</span> Chess
          </h1>
          <p className="text-chess-secondary text-xl font-medium">Choose your game mode</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Two Players Card */}
          <div className="group relative bg-chess-card border-2 border-transparent rounded-3xl p-8 transition-all hover:border-chess-green shadow-xl text-left flex flex-col h-full">
            <div className="w-20 h-20 bg-chess-bg rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Users className="text-chess-green w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Play Locally</h2>
            <p className="text-chess-secondary text-base leading-relaxed mb-8 flex-grow">
              Challenge a friend locally on the same device. Perfect for practice and face-to-face duels.
            </p>
            <button
              onClick={() => navigate('/game')}
              className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-2xl transition-all shadow-lg text-center text-lg"
            >
              Play Locally
            </button>
          </div>

          {/* Online Card */}
          <div className="group relative bg-chess-card border-2 border-transparent rounded-3xl p-8 transition-all hover:border-chess-green shadow-xl text-left flex flex-col h-full">
            <div className="w-20 h-20 bg-chess-bg rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Globe className="text-chess-green w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Play Online</h2>
            <p className="text-chess-secondary text-base leading-relaxed mb-8 flex-grow">
              Find opponents from around the world and test your skills in real-time.
            </p>
            <button
              onClick={() => navigate('/online')}
              className="w-full py-4 bg-chess-green hover:brightness-110 text-white font-bold rounded-2xl transition-all shadow-lg text-center text-lg"
            >
              Play Online
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
