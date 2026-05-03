import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Globe, 
  BrainCircuit, 
  ChevronRight, 
  Layout, 
  ShieldCheck, 
  Sparkles,
  Trophy
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#262421] text-white selection:bg-[#81b64c] selection:text-white">
      {/* Header/Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#262421]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#81b64c] rounded flex items-center justify-center text-xl">♟</div>
          <span className="text-xl font-bold tracking-tighter">CHESS</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/auth')}
            className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Login
          </button>
          <button 
            onClick={() => navigate('/auth')}
            className="bg-[#81b64c] hover:brightness-110 px-5 py-2 rounded-md text-sm font-bold transition-all shadow-lg shadow-[#81b64c]/10"
          >
            Play Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="grid grid-cols-8 h-full w-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className={`aspect-square ${Math.floor(i / 8) % 2 === i % 2 ? 'bg-white' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-zinc-400 text-sm animate-in fade-in slide-in-from-bottom duration-700">
            <Sparkles className="w-4 h-4 text-[#81b64c]" />
            <span>Now with Gemini AI Analysis</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight animate-in fade-in slide-in-from-bottom duration-1000 delay-100">
              Play Chess <br />
              <span className="text-[#81b64c]">Online</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              Free. No ads. High-level AI coach to improve your skills after every game.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
            <button 
              onClick={() => navigate('/auth')}
              className="group bg-[#81b64c] hover:brightness-110 px-10 py-5 rounded-xl text-xl font-bold transition-all shadow-2xl shadow-[#81b64c]/20 flex items-center gap-3"
            >
              Play Now 
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-10 py-5 rounded-xl text-xl font-bold border border-white/10 hover:bg-white/5 transition-all">
              Watch Demo
            </button>
          </div>
          
          <div className="pt-12 grid grid-cols-3 gap-8 max-w-3xl mx-auto opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl font-bold">10k+</span>
              <span className="text-[10px] uppercase font-black tracking-[0.2em]">Active Players</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl font-bold">50k+</span>
              <span className="text-[10px] uppercase font-black tracking-[0.2em]">Games Analyzed</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl font-bold">4.9/5</span>
              <span className="text-[10px] uppercase font-black tracking-[0.2em]">User Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#312e2b] py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold uppercase tracking-tighter">Elevate Your Game</h2>
            <p className="text-zinc-500 max-w-lg mx-auto">Everything you need to compete at the highest level, whether locally or online.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#262421] p-10 rounded-3xl border border-white/5 hover:border-[#81b64c]/30 transition-all group shadow-xl">
              <div className="w-14 h-14 bg-[#81b64c]/10 rounded-2xl flex items-center justify-center mb-8 border border-[#81b64c]/20 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Play Locally</h3>
              <p className="text-zinc-400 leading-relaxed">Challenge a friend on the same device. Perfect for quick training or casual matches over coffee.</p>
            </div>
            
            <div className="bg-[#262421] p-10 rounded-3xl border border-white/5 hover:border-[#81b64c]/30 transition-all group shadow-xl">
              <div className="w-14 h-14 bg-[#81b64c]/10 rounded-2xl flex items-center justify-center mb-8 border border-[#81b64c]/20 group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Play Online</h3>
              <p className="text-zinc-400 leading-relaxed">Real-time multiplayer with secure room codes. Compete with players across the globe instantly.</p>
            </div>
            
            <div className="bg-[#262421] p-10 rounded-3xl border border-white/5 hover:border-[#81b64c]/30 transition-all group shadow-xl">
              <div className="w-14 h-14 bg-[#81b64c]/10 rounded-2xl flex items-center justify-center mb-8 border border-[#81b64c]/20 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Analysis</h3>
              <p className="text-zinc-400 leading-relaxed">Get professional tactical feedback after every game. Learn from your mistakes with Gemini AI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#262421]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold uppercase tracking-tighter">Your Path to Mastery</h2>
          </div>
          
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-12 p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="w-20 h-20 bg-[#312e2b] rounded-full flex items-center justify-center text-4xl font-black text-[#81b64c] shadow-2xl">1</div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-2xl font-bold mb-2">Create an account</h4>
                <p className="text-zinc-400">Join our growing community in seconds. Your progress and history are saved automatically.</p>
              </div>
              <ShieldCheck className="w-16 h-16 text-zinc-800" />
            </div>

            <div className="flex flex-col md:flex-row-reverse items-center gap-12 p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="w-20 h-20 bg-[#312e2b] rounded-full flex items-center justify-center text-4xl font-black text-[#81b64c] shadow-2xl">2</div>
              <div className="flex-1 text-center md:text-right">
                <h4 className="text-2xl font-bold mb-2">Choose your game mode</h4>
                <p className="text-zinc-400">Select local play for couch sessions or dive into global multiplayer rooms with a single click.</p>
              </div>
              <Layout className="w-16 h-16 text-zinc-800" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-12 p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="w-20 h-20 bg-[#312e2b] rounded-full flex items-center justify-center text-4xl font-black text-[#81b64c] shadow-2xl">3</div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-2xl font-bold mb-2">Play and improve with AI</h4>
                <p className="text-zinc-400">Experience a sass-filled, professional analysis of your game moves to never make the same mistake twice.</p>
              </div>
              <Trophy className="w-16 h-16 text-zinc-800" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#81b64c]/10 skew-y-6 translate-y-20"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">Ready to play?</h2>
          <p className="text-xl text-zinc-400">Start your first game and let the AI Coach analyze your performance.</p>
          <button 
            onClick={() => navigate('/auth')}
            className="bg-[#81b64c] hover:brightness-110 px-12 py-6 rounded-2xl text-2xl font-bold transition-all shadow-2xl shadow-[#81b64c]/30 active:scale-[0.98]"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 opacity-50">
          <div className="w-5 h-5 bg-[#81b64c] rounded flex items-center justify-center text-[10px]">♟</div>
          <span className="font-bold tracking-tighter">CHESS APP</span>
        </div>
        <p className="text-zinc-600 text-sm">© 2025 Chess App. Developed for nfactorial Technical Task.</p>
      </footer>
    </div>
  );
}
