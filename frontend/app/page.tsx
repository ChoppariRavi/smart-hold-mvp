"use client"; // <--- CRITICAL: Tells Next.js to allow hooks like useState

import { useState } from 'react';

// 1. Types inline so we don't worry about pathing issues right now
interface Card {
  suit: 'H' | 'D' | 'C' | 'S';
  value: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [holds, setHolds] = useState<number[]>([]);
  const [coachSuggestion, setCoachSuggestion] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'DEALT' | 'FINISHED'>('IDLE');
  const [result, setResult] = useState<{ rank: string; payout: number } | null>(null);
  const [coachCommentary, setCoachCommentary] = useState<string | null>(null); // <-- Added for OpenAI commentary
  const [error, setError] = useState<string | null>(null);

  const getSuitSymbolAndColor = (suit: string) => {
    switch (suit) {
      case 'H': return { symbol: '♥', color: 'text-red-500' };
      case 'D': return { symbol: '♦', color: 'text-blue-400' }; 
      case 'C': return { symbol: '♣', color: 'text-emerald-400' }; 
      case 'S': return { symbol: '♠', color: 'text-slate-300' };
      default: return { symbol: '?', color: 'text-gray-400' };
    }
  };

  const handleDeal = async () => {
    try {
      setError(null);
      setCoachCommentary(null); // Clear previous round commentary
      const response = await fetch(`${API_BASE_URL}/deal`);
      if (!response.ok) throw new Error('Backend server is offline!');
      const data = await response.json();
      
      setGameId(data.game_id);
      setHand(data.hand);
      setCoachSuggestion(data.coach_suggestion);
      setHolds([]); 
      setResult(null);
      setGameState('DEALT');
    } catch (err: any) {
      setError(err.message || 'Failed to deal');
    }
  };

  const toggleHold = (index: number) => {
    if (gameState !== 'DEALT') return;
    setHolds(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleDraw = async () => {
    if (!gameId) return;
    try {
      setError(null);
      setCoachCommentary(null); // Clear previous round commentary
      const response = await fetch(`${API_BASE_URL}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, hold_indices: holds }),
      });
      if (!response.ok) throw new Error('Failed to process draw');
      const data = await response.json();
      
      setHand(data.final_hand);
      setResult({ rank: data.rank, payout: data.payout });
      setCoachCommentary(data.coach_commentary); // <-- Set OpenAI feedback here!
      setGameState('FINISHED');
    } catch (err: any) {
      setError(err.message || 'Failed to draw');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
          SMART-HOLD VIDEO POKER
        </h1>
        <p className="text-slate-500 mt-2 text-sm uppercase tracking-widest">Next.js 16 + FastAPI MVP</p>
      </header>

      <div className="w-full max-w-4xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
        
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-400 text-sm rounded-xl text-center font-medium">
            ⚠️ {error}. Make sure your FastAPI backend is running!
          </div>
        )}

        {/* Card Grid */}
        <div className="grid grid-cols-5 gap-4 min-h-[180px] mb-8">
          {hand.map((card, idx) => {
            const isHeld = holds.includes(idx);
            const isRecommended = coachSuggestion.includes(idx);
            const ui = getSuitSymbolAndColor(card.suit);

            return (
              <div 
                key={idx}
                onClick={() => toggleHold(idx)}
                className={`relative aspect-[2/3] bg-slate-950 border-2 rounded-xl flex flex-col justify-between p-4 cursor-pointer select-none transition-all duration-200 shadow-lg transform hover:-translate-y-1
                  ${isHeld ? 'border-emerald-500 ring-2 ring-emerald-500/20 scale-102' : 'border-slate-800 hover:border-slate-700'}
                `}
              >
                {isHeld && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded shadow">
                    HELD
                  </span>
                )}

                <span className={`text-xl font-bold ${ui.color}`}>{card.value}</span>
                <span className={`text-4xl self-center ${ui.color}`}>{ui.symbol}</span>
                <span className={`text-xl font-bold self-end rotate-180 ${ui.color}`}>{card.value}</span>

                {gameState === 'DEALT' && isRecommended && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    💡 AI Pick
                  </div>
                )}
              </div>
            );
          })}

          {hand.length === 0 && (
            <div className="col-span-5 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl h-full py-16 text-sm italic">
              Click Deal Hand to begin playing...
            </div>
          )}
        </div>

        {/* Coach Assistant Feedback */}
        {gameState === 'DEALT' && (
          <div className="mb-6 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <span className="text-xl">🤖</span>
            <div>
              <h4 className="text-sm font-semibold text-amber-400">Coach Strategy Hint</h4>
              <p className="text-xs text-amber-200/60 mt-0.5">
                The analyzer recommends holding indices: <span className="font-mono font-bold text-amber-300">[{coachSuggestion.join(', ')}]</span>. 
              </p>
            </div>
          </div>
        )}

        {/* --- NEW: Dynamic AI Coach Commentary Display --- */}
        {gameState === 'FINISHED' && coachCommentary && (
          <div className="mb-6 p-5 bg-gradient-to-r from-slate-950 to-slate-900 border-l-4 border-teal-400 rounded-r-xl shadow-lg relative overflow-hidden animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center bg-slate-900 border border-slate-800 p-2 rounded-xl min-w-[60px]">
                <span className="text-2xl mb-1">👑</span>
                <span className="text-[10px] uppercase font-black tracking-wider text-teal-400">AI COACH</span>
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Post-Game Analysis</h4>
                <p className="text-sm font-medium text-slate-100 italic leading-relaxed">
                  "{coachCommentary}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center">
            <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-wide">{result.rank}</h3>
            <p className="text-sm text-slate-400 mt-1">Payout Multiplier: +{result.payout} credits</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-center gap-4">
          {gameState !== 'DEALT' ? (
            <button 
              onClick={handleDeal}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl hover:opacity-90 active:scale-98 transition-all shadow-lg shadow-emerald-500/10"
            >
              DEAL NEW HAND
            </button>
          ) : (
            <button 
              onClick={handleDraw}
              className="px-8 py-3 bg-slate-100 text-slate-900 font-black rounded-xl hover:bg-white active:scale-98 transition-all shadow-xl"
            >
              DRAW REPLACEMENTS
            </button>
          )}
        </div>

      </div>
    </div>
  );
}