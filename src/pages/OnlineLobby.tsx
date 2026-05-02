import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, Plus, LogIn, Loader2, Copy, Check, ArrowLeft } from 'lucide-react';

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
        // Ensure roomId is clean
        const cleanRoomId = createdRoomId.split(':')[0].trim()
        
        const res = await fetch(`http://localhost:8000/rooms/${cleanRoomId}`, {
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
        console.log('[Lobby] Room status:', data)
        
        if (data.status === 'full' || data.players_count >= 2) {
          console.log('[Lobby] Room is full! Navigating to game...')
          clearInterval(interval)
          navigate(`/online/game/${cleanRoomId}`)
        }
      } catch (e) {
        console.error('[Lobby] Polling error:', e)
      }
    }, 1500)

    return () => {
      console.log('[Lobby] Stopping polling')
      clearInterval(interval)
    }
  }, [createdRoomId, navigate, token]);

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
      
      const roomId = data.room_id.split(':')[0].trim();
      setCreatedRoomId(roomId);
      console.log("[Lobby] createdRoomId set to:", roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput) return;
    
    setLoading(true);
    setError(null);
    try {
      const formattedId = roomIdInput.toUpperCase();
      const response = await fetch(`http://localhost:8000/rooms/join/${formattedId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Room not found or full');
      
      console.log("Successfully joined room. Navigating to game...");
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
            <div className="h-full bg-zinc-100 animate-[loading_2s_infinite]"></div>
          </div>
          
          <div className="space-y-2">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="text-zinc-100 w-8 h-8 animate-spin" />
            </div>
            <h1 className="text-3xl font-black text-zinc-50 tracking-tight italic">WAITING...</h1>
            <p className="text-zinc-500">Your room is ready. Share the code to start.</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em]">Room Code</p>
            <p className="text-5xl font-black text-zinc-100 tracking-widest font-mono uppercase">{createdRoomId}</p>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-full transition-all text-xs font-bold mx-auto border border-zinc-700"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'COPIED' : 'COPY CODE'}
            </button>
          </div>

          <button
            onClick={() => setCreatedRoomId(null)}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate('/')} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Globe className="text-zinc-100 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-zinc-50 tracking-tighter italic">ONLINE ARENA</h1>
          <p className="text-zinc-500 font-medium">Battle against friends in real-time</p>
        </div>

        <div className="grid gap-6 pt-4">
          <button
            onClick={createRoom}
            disabled={loading}
            className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded-3xl p-8 transition-all text-left shadow-2xl active:scale-[0.98]"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Plus className="text-zinc-100 w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-50">Create Room</h3>
                <p className="text-zinc-500 text-sm mt-1">Start a new private match</p>
              </div>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-6 h-6 text-zinc-600" />
            </div>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-zinc-950 px-4 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">OR JOIN MATCH</span>
            </div>
          </div>

          <form onSubmit={joinRoom} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="ENTER 6-CHAR CODE"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-50 font-black tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-all placeholder:text-zinc-700"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                maxLength={6}
              />
              <button
                disabled={loading || !roomIdInput}
                className="bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-black px-8 rounded-2xl transition-all shadow-xl flex items-center justify-center active:scale-95"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold uppercase tracking-wider">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
