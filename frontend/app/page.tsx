"use client";

import { useState } from 'react';

interface Card {
  suit: 'H' | 'D' | 'C' | 'S';
  value: string;
}

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [holds, setHolds] = useState<number[]>([]);
  const [coachSuggestion, setCoachSuggestion] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'DEALT' | 'FINISHED'>('IDLE');
  
  // --- NEW WALLET STATES ---
  const [balance, setBalance] = useState<number>(1000);
  const [bet, setBet] = useState<number>(1);
  const [payoutWon, setPayoutWon] = useState<number | null>(null);
  
  const [resultRank, setResultRank] = useState<string | null>(null);
  const [coachCommentary, setCoachCommentary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inside your main Home component state block:
  const [persona, setPersona] = useState<string>('vegas_pro');

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
      setCoachCommentary(null);
      setPayoutWon(null);
      setResultRank(null);

      // Append gameId and active bet amount to query string
      const url = gameId 
        ? `http://localhost:8000/deal?game_id=${gameId}&bet=${bet}` 
        : `http://localhost:8000/deal?bet=${bet}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setGameId(data.game_id);
      setHand(data.hand);
      setCoachSuggestion(data.coach_suggestion);
      setBalance(data.balance); // Synchronize bankroll balance
      setHolds([]); 
      setGameState('DEALT');
    } catch (err: any) {
      setError('Failed to process Deal request.');
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
      const response = await fetch(`http://localhost:8000/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, hold_indices: holds, persona }),
      });
      const data = await response.json();
      
      setHand(data.final_hand);
      setResultRank(data.rank);
      setPayoutWon(data.payout_won);
      setBalance(data.balance); // Capture winnings update
      setCoachCommentary(data.coach_commentary);
      setGameState('FINISHED');
    } catch (err: any) {
      setError('Failed to process Draw request.');
    }
  };

  const adjustBet = (amount: number) => {
    if (gameState === 'DEALT') return; // Lock betting during active hand
    setBet(amount);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6">
      {/* Insert this right inside your top HUD panel wrapper */}
      <div className="flex items-center gap-2 bg-slate-950 p-2 border border-slate-800 rounded-xl">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Coach Character:</label>
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className="bg-slate-900 text-sm font-semibold text-slate-100 rounded-lg px-3 py-1.5 border border-slate-700 outline-none focus:border-teal-500 transition-all cursor-pointer"
        >
          <option value="vegas_pro">🚬 Sarcastic Vegas Pro</option>
          <option value="math_prof">🎓 Combinatorics Professor</option>
          <option value="hype_man">🔥 Hype Streamer Dude</option>
        </select>
      </div>
      {/* HUD: Financial Bankroll Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your Bankroll</p>
            <h2 className="text-2xl font-black text-emerald-400">${balance} <span className="text-xs text-slate-500 font-normal">USD</span></h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Current Bet</p>
            <p className="text-xl font-bold text-amber-400">${bet} Credits</p>
          </div>
          <div className="flex gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            {[1, 2, 3, 4, 5].map((b) => (
              <button
                key={b}
                disabled={gameState === 'DEALT'}
                onClick={() => adjustBet(b)}
                className={`w-8 h-8 font-bold rounded text-xs transition-all ${
                  bet === b 
                    ? 'bg-amber-500 text-slate-950 shadow' 
                    : 'text-slate-400 hover:bg-slate-800 disabled:opacity-40'
                }`}
              >
                {b}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
        
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-400 text-sm rounded-xl text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Card Layout */}
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
              Select a bet size and click Deal Hand to start playing...
            </div>
          )}
        </div>

        {/* Coach Commentary Reveal Box */}
        {gameState === 'FINISHED' && coachCommentary && (
          <div className="mb-6 p-5 bg-gradient-to-r from-slate-950 to-slate-900 border-l-4 border-teal-400 rounded-r-xl shadow-lg">
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

        {/* Dynamic Multiplier Payoff Banner */}
        {payoutWon !== null && resultRank && (
          <div className={`mb-6 p-4 rounded-xl text-center border transition-all ${
            payoutWon > 0 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <h3 className="text-2xl font-black uppercase tracking-wide">{resultRank}</h3>
            <p className="text-sm mt-1">
              {payoutWon > 0 ? `💰 Payout Received: +${payoutWon} Credits!` : "❌ No payout combination completed."}
            </p>
          </div>
        )}

        {/* Action Button Controls */}
        <div className="flex justify-center gap-4">
          {gameState !== 'DEALT' ? (
            <button 
              onClick={handleDeal}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl hover:opacity-90 active:scale-98 transition-all shadow-lg shadow-emerald-500/10"
            >
              DEAL NEW HAND (-${bet})
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