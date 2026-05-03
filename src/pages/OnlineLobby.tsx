import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, LogIn, Loader2, Copy, Check, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '../lib/api';

export default function OnlineLobby() {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();
  const navigate = useNavigate();

  // Polling for room status if a room was created
  useEffect(() => {
    if (!createdRoomId) return

    const tokenToUse = token || localStorage.getItem('token') 
    console.log('[Lobby] Starting polling for room:', createdRoomId)

    const interval = setInterval(async () => {
      try {
        const cleanRoomId = createdRoomId.split(':')[0].trim()
        
        const res = await fetch(`${getApiUrl()}/rooms/${cleanRoomId}`, {
          headers: { 
            'Authorization': `Bearer ${tokenToUse}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!res.ok) {
          console.error('[Lobby] Poll failed:', res.status)
          return
        }
        
        const data = await res.json()
        
        if (data.status === 'full' || data.players_count >= 2) {
          clearInterval(interval)
          navigate(`/online/game/${cleanRoomId}`)
        }
      } catch (e) {
        console.error('[Lobby] Polling error:', e)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [createdRoomId, navigate, token]);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/rooms/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create room');
      
      const roomId = data.room_id.split(':')[0].trim();
      setCreatedRoomId(roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedId = roomIdInput.trim().toUpperCase();
    if (!formattedId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/rooms/join/${formattedId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Room not found or full');
      
      navigate(`/online/game/${formattedId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (createdRoomId) {
      navigator.clipboard.writeText(createdRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdRoomId) {
    return (
      <div className="min-h-screen bg-chess-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-chess-card border border-zinc-700/50 rounded-3xl p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-chess-input">
            <div className="h-full bg-chess-green animate-[loading_2s_infinite]"></div>
          </div>
          
          <div className="space-y-4">
            <div className="w-20 h-20 bg-chess-bg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Loader2 className="text-chess-green w-10 h-10 animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Waiting for Opponent</h1>
            <p className="text-chess-secondary font-medium">Your room is ready. Share the code to start.</p>
          </div>

          <div className="bg-chess-input border border-[#4a4a4a] rounded-2xl p-8 space-y-4 shadow-inner">
            <p className="text-xs font-bold text-chess-secondary uppercase tracking-[0.2em]">Room Code</p>
            <p className="text-5xl font-bold text-white tracking-widest font-mono uppercase">{createdRoomId}</p>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-6 py-2 bg-chess-green hover:brightness-110 text-white rounded-full transition-all text-sm font-bold mx-auto shadow-lg"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'COPIED' : 'COPY CODE'}
            </button>
          </div>

          <button
            onClick={() => setCreatedRoomId(null)}
            className="text-chess-secondary hover:text-white text-sm font-bold transition-colors pt-4"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="absolute top-6 left-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-chess-card border border-zinc-700/50 text-white hover:bg-zinc-700 rounded-lg transition-all text-sm font-bold shadow-lg">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight flex items-center justify-center gap-4">
            <span className="text-6xl">♟</span> Online
          </h1>
          <p className="text-chess-secondary text-lg font-medium">Create or join a game</p>
        </div>

        <div className="bg-chess-card border border-zinc-700/50 rounded-2xl p-8 shadow-2xl space-y-8">
          <button
            onClick={createRoom}
            disabled={loading}
            className="group w-full bg-chess-green hover:brightness-110 disabled:opacity-50 text-white rounded-xl p-6 transition-all shadow-lg active:scale-[0.98] text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="w-8 h-8" />
              <span className="text-xl font-bold">Create New Room</span>
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700"></span>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-chess-card px-4 text-xs font-bold text-chess-secondary uppercase tracking-widest">or join by code</span>
            </div>
          </div>

          <form onSubmit={joinRoom} className="space-y-4">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="6-CHAR CODE"
                className="w-full bg-chess-input border border-[#4a4a4a] rounded-xl px-6 py-4 text-white text-center font-bold text-2xl tracking-[0.2em] uppercase focus:outline-none focus:border-chess-green transition-all placeholder:text-zinc-700"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                disabled={loading || !roomIdInput}
                className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
                Join Game
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
