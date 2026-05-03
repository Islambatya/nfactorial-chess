import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Globe, LogOut, Clock } from 'lucide-react';

export default function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#262421] flex flex-col items-center justify-center p-4 relative">
      {/* Header */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <div className="flex items-center gap-3 bg-[#312e2b] border border-zinc-700/50 rounded-full px-4 py-2 shadow-lg">
          <div className="w-8 h-8 bg-[#81b64c] rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.email?.[0].toUpperCase()}
          </div>
          <span className="text-sm text-white font-medium">{user?.email?.split('@')[0]}</span>
          <button
            onClick={logout}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl text-center space-y-12">
        <div>
          <h1 className="text-6xl font-bold text-white tracking-tight mb-4 flex items-center justify-center gap-4">
            <span className="text-7xl">♟</span> Chess
          </h1>
          <p className="text-zinc-500 text-xl font-medium uppercase tracking-[0.2em]">Choose your game mode</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Two Players Card */}
          <div className="group relative bg-[#312e2b] border-2 border-transparent rounded-3xl p-8 transition-all hover:border-[#81b64c] shadow-xl text-left flex flex-col h-full">
            <div className="w-20 h-20 bg-[#262421] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-zinc-800">
              <Users className="text-[#81b64c] w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Local Game</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 flex-grow">
              Challenge a friend locally on the same device.
            </p>
            <button
              onClick={() => navigate('/game')}
              className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-center text-lg"
            >
              Play Locally
            </button>
          </div>

          {/* Online Card */}
          <div className="group relative bg-[#312e2b] border-2 border-transparent rounded-3xl p-8 transition-all hover:border-[#81b64c] shadow-xl text-left flex flex-col h-full">
            <div className="w-20 h-20 bg-[#262421] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-zinc-800">
              <Globe className="text-[#81b64c] w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Online Mode</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 flex-grow">
              Find opponents from around the world.
            </p>
            <button
              onClick={() => navigate('/online')}
              className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-center text-lg"
            >
              Play Online
            </button>
          </div>

          {/* History Card */}
          <div className="group relative bg-[#312e2b] border-2 border-transparent rounded-3xl p-8 transition-all hover:border-[#81b64c] shadow-xl text-left flex flex-col h-full">
            <div className="w-20 h-20 bg-[#262421] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-zinc-800">
              <Clock className="text-[#81b64c] w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Game History</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 flex-grow">
              Review and analyze your past games with AI.
            </p>
            <button
              onClick={() => navigate('/history')}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all shadow-lg text-center text-lg border border-zinc-700"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
