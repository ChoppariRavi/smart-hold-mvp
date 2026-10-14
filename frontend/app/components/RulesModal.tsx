"use client";

import React, { useState } from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBet: number;
}

const PAYTABLE_ROWS = [
  { hand: "Royal Flush", pays: [250, 500, 750, 1000, 4000] },
  { hand: "Straight Flush", pays: [50, 100, 150, 200, 250] },
  { hand: "Four of a Kind", pays: [25, 50, 75, 100, 125] },
  { hand: "Full House", pays: [9, 18, 27, 36, 45] },
  { hand: "Flush", pays: [6, 12, 18, 24, 30] },
  { hand: "Straight", pays: [4, 8, 12, 16, 20] },
  { hand: "Three of a Kind", pays: [3, 6, 9, 12, 15] },
  { hand: "Two Pair", pays: [2, 4, 6, 8, 10] },
  { hand: "Jacks or Better", pays: [1, 2, 3, 4, 5] },
];

export default function RulesModal({ isOpen, onClose, currentBet }: RulesModalProps) {
  const [activeTab, setActiveTab] = useState<"paytable" | "gto" | "disclaimer">("paytable");

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-black text-sm sm:text-base tracking-wide">
              Smart Hold Poker
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Guide
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-bold text-center bg-slate-900">
          <button
            onClick={() => setActiveTab("paytable")}
            className={`py-2.5 transition border-b-2 ${
              activeTab === "paytable"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            9/6 Paytable
          </button>
          <button
            onClick={() => setActiveTab("gto")}
            className={`py-2.5 transition border-b-2 ${
              activeTab === "gto"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            GTO Engine
          </button>
          <button
            onClick={() => setActiveTab("disclaimer")}
            className={`py-2.5 transition border-b-2 ${
              activeTab === "disclaimer"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Disclaimers
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-slate-300 text-xs leading-relaxed">
          
          {/* TAB 1: 9/6 PAYTABLE */}
          {activeTab === "paytable" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Standard Full-Pay (99.54% theoretical return)</span>
                <span className="text-emerald-400 font-bold">Active Bet: {currentBet}x</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 uppercase text-[9px] tracking-wider">
                      <th className="py-2 px-2.5">Hand</th>
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <th
                          key={lvl}
                          className={`py-2 px-2 text-center transition-colors ${
                            currentBet === lvl ? "text-emerald-400 bg-emerald-500/10 font-black" : ""
                          }`}
                        >
                          {lvl}x
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {PAYTABLE_ROWS.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-850/40 transition">
                        <td className="py-1.5 px-2.5 font-sans font-medium text-slate-200">
                          {row.hand}
                        </td>
                        {row.pays.map((val, idx) => {
                          const isColActive = currentBet === idx + 1;
                          const isJackpot = row.hand === "Royal Flush" && idx === 4;
                          return (
                            <td
                              key={idx}
                              className={`py-1.5 px-2 text-center ${
                                isColActive ? "bg-emerald-500/10 font-bold text-emerald-300" : "text-slate-400"
                              } ${isJackpot ? "text-amber-400 font-black" : ""}`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Note: 5-coin max bet awards the 4,000 credit jackpot on Royal Flush (800-for-1 ratio vs 250-for-1 standard).
              </p>
            </div>
          )}

          {/* TAB 2: GTO ACCURACY SYSTEM */}
          {activeTab === "gto" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                  How GTO Accuracy Is Calculated
                </div>
                <p className="text-slate-400">
                  Video Poker is mathematically solved. For every 5 cards dealt, there are <strong>32 possible hold combinations</strong> ($2^5$). The solver evaluates the exact Expected Value (EV) of every combination against the remaining 47 cards.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-400 text-xs">95% – 100% GTO Accuracy</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      The mathematically optimal play that maximizes theoretical return over the long run.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    Optimal
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-amber-400 text-xs">40% – 94% Accuracy</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Sub-optimal hold. Captures partial equity but concedes mathematical edge to the house.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                    Leak
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-rose-400 text-xs">0% – 35% Accuracy</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Complete strategic blunder (e.g. discarding high pairs, breaking 4-flushes, or holding kickers).
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                    Blunder
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEGAL & EDUCATIONAL DISCLAIMER */}
          {activeTab === "disclaimer" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 space-y-1.5">
                <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
                  <span>⚠️</span> Free Educational Simulator
                </div>
                <p className="text-[11px] leading-relaxed">
                  <strong>Smart Hold Poker</strong> is strictly an educational training utility intended to help players understand probability, combinatorics, and strategy.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-200">Regulatory Terms:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Zero Real-Money Risk:</strong> The site does not facilitate real-money wagering, betting, or cash payouts.</li>
                  <li><strong>Virtual Currency:</strong> All chips and bankroll counters are simulated tokens and have no monetary value.</li>
                  <li><strong>Educational Purpose:</strong> GTO scores simulate theoretical probabilities and do not guarantee future casino results.</li>
                </ul>
              </div>

              <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-800/80">
                Concerned about gambling habits? Confidential help is available: call <strong>1-800-GAMBLER</strong> (US) or visit <strong>BeGambleAware.org</strong> (UK).
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}