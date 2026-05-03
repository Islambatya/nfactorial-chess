import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Sparkles, BrainCircuit, X, Flag, ArrowLeft, Loader2, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const categories = [
  { name: 'Bullet', icon: '🚀', options: [1, 2] },
  { name: 'Blitz', icon: '⚡', options: [3, 5] },
  { name: 'Rapid', icon: '🏃', options: [10, 15] },
  { name: 'Classical', icon: '♟', options: [30, 45] },
];

const QUESTIONS = [
  { question: "What is the capital of France?", options: ["London", "Paris", "Berlin", "Rome"], correct: 1 },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1 },
  { question: "What is the chemical symbol for gold?", options: ["Ag", "Fe", "Au", "Cu"], correct: 2 },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
  { question: "What is the tallest mammal?", options: ["Elephant", "Giraffe", "Hippopotamus", "Rhinoceros"], correct: 1 },
  { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
  { question: "What is the largest continent?", options: ["North America", "Africa", "Europe", "Asia"], correct: 3 },
  { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], correct: 2 },
  { question: "What is the hardest natural substance?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct: 2 },
  { question: "Which country is home to the kangaroo?", options: ["New Zealand", "South Africa", "Australia", "Brazil"], correct: 2 },
  { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Onion", "Pepper"], correct: 1 },
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
  { question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Horse", "Greyhound"], correct: 1 },
  { question: "Who was the first person on the moon?", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], correct: 2 },
  { question: "What is the largest organ in the human body?", options: ["Heart", "Liver", "Brain", "Skin"], correct: 3 },
  { question: "Which language has the most native speakers?", options: ["English", "Spanish", "Hindi", "Mandarin Chinese"], correct: 3 },
  { question: "What is the freezing point of water in Celsius?", options: ["0", "32", "100", "212"], correct: 0 },
  { question: "What shape is a stop sign?", options: ["Hexagon", "Octagon", "Pentagon", "Square"], correct: 1 },
];

export default function QuizGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isGameSaved, setIsGameSaved] = useState(false);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);

  // Quiz States
  const [quizState, setQuizState] = useState<{
    show: boolean;
    move: { from: string; to: string; promotion?: string } | null;
    questionIndex: number | null;
    answerStatus: 'correct' | 'wrong' | null;
    selectedOption: number | null;
  }>({ show: false, move: null, questionIndex: null, answerStatus: null, selectedOption: null });
  const recentQuestions = useRef<number[]>([]);
  
  // Timer States
  const [tempSelectedTime, setTempSelectedTime] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  // Player names
  const [whiteName, setWhiteName] = useState('White');
  const [blackName, setBlackName] = useState('Black');
  const [namesEntered, setNamesEntered] = useState(false);
  const [tempWhiteName, setTempWhiteName] = useState('');
  const [tempBlackName, setTempBlackName] = useState('');
  
  const timerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [pieceTheme, setPieceTheme] = useState(localStorage.getItem('pieceTheme') || 'classic');
  const [isPro, setIsPro] = useState(() => localStorage.getItem('isPro') === 'true');

  useEffect(() => {
    const handleStorage = () => {
      setPieceTheme(localStorage.getItem('pieceTheme') || 'classic');
      setIsPro(localStorage.getItem('isPro') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  const PIECES = ['wP','wN','wB','wR','wQ','wK','bP','bN','bB','bR','bQ','bK'] as const;
  const customPieces = pieceTheme !== 'classic'
    ? Object.fromEntries(
        PIECES.map((p) => [
          p,
          ({ squareWidth }: { squareWidth: number }) => (
            <img
              src={`https://www.chess.com/chess-themes/pieces/${pieceTheme}/150/${p}.png`}
              style={{ width: squareWidth, height: squareWidth }}
              alt={p}
            />
          ),
        ])
      )
    : undefined;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnalysis = useCallback(async (pgn: string, color: 'white' | 'black' = 'white') => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${getApiUrl()}/analyze-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn, color }),
      });
      const data = await response.json();
      setCoachTip(data.analysis || data.detail);
      setShowCoachModal(true);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setCoachTip("Analysis failed. Check backend.");
      setShowCoachModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const saveGame = useCallback(async (gameInstance: Chess, gameWinner: string) => {
    if (!token) return;
    try {
      await fetch(`${getApiUrl()}/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          white_player: whiteName,
          black_player: blackName,
          pgn: gameInstance.pgn(),
          result: gameWinner,
        }),
      });
      console.log('[History] Game saved to history');
    } catch (e) {
      console.error('[History] Failed to save game:', e);
    }
  }, [token, whiteName, blackName]);

  const finishGame = useCallback((_gameInstance: Chess, gameWinner: string, gameReason: string) => {
    if (isGameOver) return;
    setIsGameOver(true);
    setWinner(gameWinner);
    setReason(gameReason);
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (!isGameSaved) {
      setIsGameSaved(true);
      saveGame(_gameInstance, gameWinner);
    }
  }, [isGameOver, isGameSaved, handleAnalysis, saveGame]);

  useEffect(() => {
    if (selectedTime && !isGameOver) {
      timerRef.current = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              finishGame(game, "Black", "on Time");
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              finishGame(game, "White", "on Time");
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedTime, game, isGameOver, finishGame]);

  const skipTurn = useCallback((currentGame: Chess) => {
    const fenArr = currentGame.fen().split(' ');
    fenArr[1] = fenArr[1] === 'w' ? 'b' : 'w';
    fenArr[3] = '-'; // clear en passant
    if (fenArr[1] === 'w') {
      fenArr[5] = String(Number(fenArr[5]) + 1); // increment fullmove
    }
    const newFen = fenArr.join(' ');
    const newGame = new Chess(newFen);
    setGame(newGame);
    setFen(newFen);
  }, []);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    if (isGameOver) return false;
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setFen(gameCopy.fen());

        if (gameCopy.isGameOver()) {
          let gameReason = "Game Over";
          let gameWinner = "Draw";
          if (gameCopy.isCheckmate()) {
            gameReason = "by Checkmate";
            gameWinner = gameCopy.turn() === 'w' ? 'Black' : 'White';
          } else if (gameCopy.isDraw()) {
            gameReason = "Draw";
            gameWinner = "Draw";
          }
          finishGame(gameCopy, gameWinner, gameReason);
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, isGameOver, finishGame]);

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare || isGameOver || !selectedTime || quizState.show) return false;
    
    // Validate move first
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!move) return false; // invalid move
    } catch {
      return false;
    }

    // Pick a random question that wasn't recently asked
    let qIdx = Math.floor(Math.random() * QUESTIONS.length);
    while (recentQuestions.current.includes(qIdx)) {
      qIdx = Math.floor(Math.random() * QUESTIONS.length);
    }
    recentQuestions.current.push(qIdx);
    if (recentQuestions.current.length > 3) recentQuestions.current.shift();

    setQuizState({
      show: true,
      move: { from: sourceSquare, to: targetSquare, promotion: 'q' },
      questionIndex: qIdx,
      answerStatus: null,
      selectedOption: null,
    });
    
    return false; // Snap piece back while quiz is shown
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (quizState.answerStatus || quizState.questionIndex === null) return;
    
    const isCorrect = optionIndex === QUESTIONS[quizState.questionIndex].correct;
    setQuizState(prev => ({ ...prev, answerStatus: isCorrect ? 'correct' : 'wrong', selectedOption: optionIndex }));

    setTimeout(() => {
      if (isCorrect && quizState.move) {
        makeMove(quizState.move);
      } else {
        skipTurn(game);
      }
      setQuizState({ show: false, move: null, questionIndex: null, answerStatus: null, selectedOption: null });
    }, 1500);
  };

  const startWithTime = () => {
    if (!tempSelectedTime) return;
    setSelectedTime(tempSelectedTime);
    setWhiteTime(tempSelectedTime * 60);
    setBlackTime(tempSelectedTime * 60);
    setIsGameOver(false);
    setWinner(null);
    setReason(null);
    setIsGameSaved(false);
  };

  const handleNewGame = () => {
    setGame(new Chess());
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setIsGameOver(false);
    setWinner(null);
    setReason(null);
    setIsGameSaved(false);
    setSelectedTime(null);
    setTempSelectedTime(null);
    setNamesEntered(false);
    setTempWhiteName('');
    setTempBlackName('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleNamesSubmit = () => {
    setWhiteName(tempWhiteName.trim() || 'White');
    setBlackName(tempBlackName.trim() || 'Black');
    setNamesEntered(true);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#262421] text-white overflow-hidden">
      {/* Board Area */}
      <div className="flex-1 h-full flex items-center justify-center p-4">
        <div className="w-full max-w-[calc(100vh-40px)] aspect-square relative shadow-2xl">
          <Chessboard 
            options={{
              position: fen, 
              onPieceDrop: onDrop,
              boardOrientation: "white",
              darkSquareStyle: { backgroundColor: '#b58863' },
              lightSquareStyle: { backgroundColor: '#f0d9b5' },
              animationDurationInMs: 200,
              ...(customPieces ? { customPieces } : {}),
            }}
          />
          
          {/* End Game Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 rounded-lg animate-in fade-in duration-500">
              <div className="bg-[#312e2b] border border-zinc-700 p-10 rounded-3xl shadow-2xl space-y-8 scale-110">
                <div className="w-20 h-20 bg-[#262421] rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-zinc-800">
                  <Sparkles className="w-10 h-10 text-[#81b64c]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold uppercase tracking-tight text-white">
                    {winner === 'Draw' ? 'Draw!' : winner === 'White' ? `${whiteName} Wins!` : winner === 'Black' ? `${blackName} Wins!` : `${winner} Wins!`}
                  </h2>
                  <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest">{reason}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {isPro ? (
                      <>
                        <button 
                          onClick={() => handleAnalysis(game.pgn(), 'white')} 
                          disabled={isAnalyzing}
                          className="py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50"
                        >
                          <BrainCircuit className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse text-[#81b64c]' : 'text-[#81b64c]'}`} />
                          Destroy {whiteName}
                        </button>
                        <button 
                          onClick={() => handleAnalysis(game.pgn(), 'black')} 
                          disabled={isAnalyzing}
                          className="py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50"
                        >
                          <BrainCircuit className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse text-[#81b64c]' : 'text-[#81b64c]'}`} />
                          Destroy {blackName}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => navigate('/premium')}
                        className="col-span-2 py-4 bg-gradient-to-r from-zinc-800 to-[#312e2b] hover:from-zinc-700 hover:to-zinc-800 text-[#81b64c] font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 border border-[#81b64c]/30"
                      >
                        <Crown className="w-5 h-5" />
                        Unlock Brutal AI Coach (Pro)
                      </button>
                    )}
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center justify-center gap-2 text-[#81b64c] text-xs font-bold animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      COACH IS COOKING...
                    </div>
                  )}
                  <button 
                    onClick={handleNewGame} 
                    className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
                  >
                    New Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[400px] bg-[#312e2b] flex flex-col border-l border-zinc-800 shadow-2xl">
        {!namesEntered ? (
          /* Step 1: Player Name Entry */
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-xl font-bold tracking-tight">Player Names</h2>
              <p className="text-zinc-500 text-sm mt-1">Enter names before starting</p>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">⬜ White Player</label>
                <input
                  type="text"
                  value={tempWhiteName}
                  onChange={e => setTempWhiteName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNamesSubmit()}
                  placeholder="White"
                  className="w-full px-4 py-3 bg-[#2c2c2c] border border-[#4a4a4a] focus:border-[#81b64c] text-white rounded-md outline-none transition-all font-semibold placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">⬛ Black Player</label>
                <input
                  type="text"
                  value={tempBlackName}
                  onChange={e => setTempBlackName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNamesSubmit()}
                  placeholder="Black"
                  className="w-full px-4 py-3 bg-[#2c2c2c] border border-[#4a4a4a] focus:border-[#81b64c] text-white rounded-md outline-none transition-all font-semibold placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800">
              <button
                onClick={handleNamesSubmit}
                className="w-full py-4 bg-[#81b64c] hover:brightness-110 text-white font-bold text-base rounded-md transition-all shadow-lg uppercase tracking-wider"
              >
                Continue →
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full mt-4 py-2 text-zinc-600 hover:text-zinc-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Menu
              </button>
            </div>
          </div>
        ) : !selectedTime ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-xl font-bold tracking-tight">Time Control</h2>
              <p className="text-zinc-500 text-sm mt-1">{whiteName} vs {blackName}</p>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 font-black uppercase text-[11px] tracking-[0.2em]">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTempSelectedTime(mins)}
                        className={`min-w-[80px] px-5 py-2.5 rounded-md text-sm font-semibold transition-all border ${
                          tempSelectedTime === mins 
                          ? 'bg-[#81b64c] border-[#81b64c] text-white shadow-lg' 
                          : 'bg-[#2c2c2c] border-[#4a4a4a] text-white hover:border-[#81b64c]'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-zinc-800">
              <button
                onClick={startWithTime}
                disabled={!tempSelectedTime}
                className={`w-full py-4 text-white font-bold text-base rounded-md transition-all shadow-lg uppercase tracking-wider ${
                  tempSelectedTime ? 'bg-[#81b64c] hover:brightness-110' : 'bg-[#4a4a4a] cursor-not-allowed opacity-50'
                }`}
              >
                Start Game
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full mt-4 py-2 text-zinc-600 hover:text-zinc-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Menu
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-8 animate-in slide-in-from-right duration-300 space-y-12">
            {/* Black Timer */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'b' ? 'bg-[#262421] border-[#81b64c]' : 'bg-transparent border-transparent opacity-40'}`}>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{blackName}</p>
              <div className={`text-6xl font-mono font-bold text-center ${blackTime < 10 && game.turn() === 'b' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(blackTime)}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-full h-px bg-zinc-800"></div>
              <span className="text-zinc-700 font-black italic">VS</span>
              <div className="w-full h-px bg-zinc-800"></div>
            </div>

            {/* White Timer */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${game.turn() === 'w' ? 'bg-[#262421] border-[#81b64c]' : 'bg-transparent border-transparent opacity-40'}`}>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{whiteName}</p>
              <div className={`text-6xl font-mono font-bold text-center ${whiteTime < 10 && game.turn() === 'w' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(whiteTime)}
              </div>
            </div>

            <div className="pt-8">
              <button 
                onClick={handleNewGame}
                className="w-full py-4 bg-[#2c2c2c] hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-[#4a4a4a] hover:border-red-900/50 rounded-md transition-all font-bold flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Resign
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coach Modal */}
      {showCoachModal && coachTip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#312e2b] border border-[#81b64c]/30 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300">
            <button onClick={() => setShowCoachModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-800 transition-all">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#81b64c]/10 rounded-full flex items-center justify-center border border-[#81b64c]/20">
                <Sparkles className="w-8 h-8 text-[#81b64c]" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-50">Brutal Coach 🔥</h2>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 italic text-zinc-300 text-lg leading-relaxed">
                {coachTip}
              </div>
              <button onClick={() => setShowCoachModal(false)} className="mt-6 px-8 py-3 bg-[#81b64c] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {quizState.show && quizState.questionIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#312e2b] border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in duration-300 flex flex-col items-center">
            <div className="text-4xl mb-4">🧠</div>
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Answer to play, {game.turn() === 'w' ? whiteName : blackName}!
            </h2>
            <p className="text-xl text-center mb-8 font-medium">
              {QUESTIONS[quizState.questionIndex].question}
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {QUESTIONS[quizState.questionIndex].options.map((opt, idx) => {
                let btnClass = "py-4 px-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-bold transition-all hover:border-[#81b64c]";
                if (quizState.answerStatus) {
                  const isCorrectAnswer = QUESTIONS[quizState.questionIndex!].correct === idx;
                  const isSelected = quizState.selectedOption === idx;
                  if (isCorrectAnswer) {
                    btnClass = "py-4 px-6 bg-green-500/20 border border-green-500 text-green-400 rounded-xl font-bold transition-all";
                  } else if (isSelected && !isCorrectAnswer) {
                    btnClass = "py-4 px-6 bg-red-500/20 border border-red-500 text-red-400 rounded-xl font-bold transition-all";
                  } else {
                    btnClass = "py-4 px-6 bg-zinc-800 border border-zinc-800 text-zinc-600 rounded-xl font-bold transition-all opacity-50";
                  }
                }
                return (
                  <button 
                    key={idx} 
                    onClick={() => handleQuizAnswer(idx)}
                    disabled={!!quizState.answerStatus}
                    className={btnClass}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizState.answerStatus && (
              <div className={`text-lg font-bold animate-in fade-in ${quizState.answerStatus === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                {quizState.answerStatus === 'correct' ? 'Correct! Make your move ✓' : 'Wrong! Turn skipped ✗'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
