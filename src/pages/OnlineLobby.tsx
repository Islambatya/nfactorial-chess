import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, Plus, LogIn, Loader2, Copy, Check } from 'lucide-react';

export default function OnlineLobby() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();
  const navigate = useNavigate();

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/rooms/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create room');
      setCreatedRoom(data.room_id);
      
      // Start polling or just wait for someone to join?
      // In this simple impl, we'll just navigate to the game and wait there.
      navigate(`/online/game/${data.room_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/rooms/join/${roomId.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Room not found or full');
      
      navigate(`/online/game/${roomId.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="text-zinc-100 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-50">Online Multiplayer</h1>
          <p className="text-zinc-500">Create a room or join a friend</p>
        </div>

        <div className="grid gap-6">
          {/* Create Room */}
          <button
            onClick={createRoom}
            disabled={loading}
            className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition-all text-left shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Plus className="text-zinc-100 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-50">Create New Room</h3>
                <p className="text-zinc-500 text-sm">Get a code and invite a friend</p>
              </div>
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-600 font-bold">Or join by code</span>
            </div>
          </div>

          {/* Join Room */}
          <form onSubmit={joinRoom} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ENTER CODE"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-50 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={6}
              />
              <button
                disabled={loading || !roomId}
                className="bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-bold px-6 rounded-xl transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Join
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
