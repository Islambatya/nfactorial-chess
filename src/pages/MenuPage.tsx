import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Globe, LogOut } from 'lucide-react';

export default function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative">
      {/* Header */}
      <div className="absolute top-4 right-4 flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-2">
        <span className="text-sm text-zinc-400 font-medium">{user?.email}</span>
        <button
          onClick={logout}
          className="p-1.5 text-zinc-500 hover:text-zinc-100 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full max-w-2xl text-center space-y-12">
        <div>
          <h1 className="text-5xl font-black text-zinc-50 tracking-tighter mb-4">CHESS SERVICE</h1>
          <p className="text-zinc-500 text-lg">Choose your battle mode</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Two Players Card */}
          <button
            onClick={() => navigate('/game')}
            className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 transition-all hover:border-zinc-600 hover:scale-[1.02] overflow-hidden text-left"
          >
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <Users className="text-zinc-100 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-50 mb-2">Two Players</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Challenge a friend locally on the same device. Perfect for practice and local duels.
            </p>
            <div className="mt-8 flex items-center text-zinc-300 font-semibold group-hover:translate-x-2 transition-transform">
              Play Locally →
            </div>
          </button>

          {/* Online Card */}
          <button
            onClick={() => navigate('/online')}
            className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 transition-all hover:border-zinc-600 hover:scale-[1.02] overflow-hidden text-left"
          >
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <Globe className="text-zinc-100 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-50 mb-2">Online</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Find opponents from around the world and climb the leaderboards.
            </p>
            <div className="mt-8 flex items-center text-zinc-300 font-semibold group-hover:translate-x-2 transition-transform">
              Join Lobby →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
