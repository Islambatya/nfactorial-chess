import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '../lib/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const bodyPayload = isLogin 
        ? { email, password } 
        : { email, username, password };

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Auth failed');

      login(data.access_token, data.user);
      navigate('/menu');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center gap-2">
          <span className="text-5xl">♟</span> Chess
        </h1>
      </div>

      <div className="w-full max-w-md bg-chess-card rounded-xl shadow-2xl overflow-hidden border-none">
        <div className="flex border-b border-zinc-700/50">
          <button
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
              isLogin ? 'text-white' : 'text-chess-secondary hover:text-zinc-300'
            }`}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Log In
            {isLogin && <div className="absolute bottom-0 left-0 w-full h-1 bg-chess-green" />}
          </button>
          <button
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
              !isLogin ? 'text-white' : 'text-chess-secondary hover:text-zinc-300'
            }`}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Sign Up
            {!isLogin && <div className="absolute bottom-0 left-0 w-full h-1 bg-chess-green" />}
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <input
                type="email"
                required
                className="w-full bg-[#2c2c2c] border border-[#4a4a4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#81b64c] transition-all placeholder:text-zinc-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
            </div>

            {!isLogin && (
              <div>
                <input
                  type="text"
                  required
                  className="w-full bg-[#2c2c2c] border border-[#4a4a4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#81b64c] transition-all placeholder:text-zinc-600"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
            )}

            <div>
              <input
                type="password"
                required
                className="w-full bg-[#2c2c2c] border border-[#4a4a4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#81b64c] transition-all placeholder:text-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>

            {!isLogin && (
              <div>
                <input
                  type="password"
                  required
                  className="w-full bg-[#2c2c2c] border border-[#4a4a4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#81b64c] transition-all placeholder:text-zinc-600"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                />
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-chess-green hover:brightness-110 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
