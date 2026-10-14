"use client";

import React, { useState, useEffect, useCallback } from "react";
import RulesModal from "./components/RulesModal";
// Inside frontend/src/app/page.tsx
import {
  Card,
  generateDeck,
  evaluateHandRank,
  calculatePayout,
  getOptimalHolds,
  getCoachCommentary,
} from "./core/pokerEngine";
import LegalModal from "./components/LegalModal";
// Inside frontend/src/app/page.tsx
import { trackEvent } from "./lib/analytics";

const STORAGE_KEYS = {
  BANKROLL: "shp_bankroll",
  ACCURACY_HISTORY: "shp_accuracy_history",
  PERSONA: "shp_persona",
  BET: "shp_current_bet",
};

const INITIAL_BANKROLL = 1000;
const INITIAL_PERSONA = "vegas_pro";

const SUIT_META: Record<
  string,
  { symbol: string; color: string; name: string }
> = {
  H: { symbol: "♥", color: "text-rose-400", name: "Hearts" },
  HEARTS: { symbol: "♥", color: "text-rose-400", name: "Hearts" },
  D: { symbol: "♦", color: "text-blue-400", name: "Diamonds" },
  DIAMONDS: { symbol: "♦", color: "text-blue-400", name: "Diamonds" },
  C: { symbol: "♣", color: "text-emerald-400", name: "Clubs" },
  CLUBS: { symbol: "♣", color: "text-emerald-400", name: "Clubs" },
  S: { symbol: "♠", color: "text-slate-100", name: "Spades" },
  SPADES: { symbol: "♠", color: "text-slate-100", name: "Spades" },
};

const HOST = process.env.NEXT_PUBLIC_API_HOST || "http://localhost:8000";

export default function PokerGame() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [hand, setHand] = useState<(Card | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [holds, setHolds] = useState<number[]>([]);
  const [coachSuggestion, setCoachSuggestion] = useState<number[]>([]);
  const [gameState, setGameState] = useState<"IDLE" | "DEALT" | "FINISHED">(
    "IDLE",
  );

  // Persistent States
  const [balance, setBalance] = useState<number>(INITIAL_BANKROLL);
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([]);
  const [sessionAverage, setSessionAverage] = useState<number>(100);
  const [persona, setPersona] = useState<string>(INITIAL_PERSONA);
  const [bet, setBet] = useState<number>(1);

  // Round Results
  const [handAccuracy, setHandAccuracy] = useState<number | null>(null);
  const [payoutWon, setPayoutWon] = useState<number | null>(null);
  const [resultRank, setResultRank] = useState<string | null>(null);
  const [coachCommentary, setCoachCommentary] = useState<string | null>(null);

  // Modals & Hydration
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Inside component:
  const [deck, setDeck] = useState<Card[]>([]);
  const [optimalHolds, setOptimalHolds] = useState<number[]>([]);

  // Add state:
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);

    // 1. Session tracking ref inside the component
  const sessionHandsRef = React.useRef<number>(0);
  const sessionAccHistoryRef = React.useRef<number[]>([]);

  // 1. Initial State Hydration
  useEffect(() => {
    try {
      const savedBalance = localStorage.getItem(STORAGE_KEYS.BANKROLL);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.ACCURACY_HISTORY);
      const savedPersona = localStorage.getItem(STORAGE_KEYS.PERSONA);
      const savedBet = localStorage.getItem(STORAGE_KEYS.BET);

      if (savedBalance !== null)
        setBalance(Number(savedBalance) || INITIAL_BANKROLL);
      if (savedHistory !== null) {
        const hist = JSON.parse(savedHistory);
        if (Array.isArray(hist) && hist.length > 0) {
          setAccuracyHistory(hist);
          setSessionAverage(
            Math.round(hist.reduce((a, b) => a + b, 0) / hist.length),
          );
        }
      }
      if (savedPersona) setPersona(savedPersona);
      if (savedBet !== null) setBet(Number(savedBet) || 1);
    } catch {
      // Graceful fallback on storage access blocks
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. LocalStorage Syncing
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.BANKROLL, balance?.toString());
  }, [balance, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(
      STORAGE_KEYS.ACCURACY_HISTORY,
      JSON.stringify(accuracyHistory),
    );
    if (accuracyHistory.length > 0) {
      setSessionAverage(
        Math.round(
          accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length,
        ),
      );
    }
  }, [accuracyHistory, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.PERSONA, persona);
  }, [persona, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.BET, bet.toString());
  }, [bet, isHydrated]);

  const toggleHold = useCallback(
    (index: number) => {
      if (gameState !== "DEALT") return;
      setHolds((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index],
      );
    },
    [gameState],
  );

  // Handle Deal (0 network calls, < 5ms)
  const handleDeal = useCallback(() => {
    if (balance < bet) {
      setShowResetModal(true);
      return;
    }

    // Deduct bet
    setBalance((prev) => prev - bet);
    setCoachCommentary(null);
    setPayoutWon(null);
    setResultRank(null);
    setHandAccuracy(null);
    setHolds([]);

    // Generate & deal 5 cards
    const newDeck = generateDeck();
    const dealtHand = newDeck.slice(0, 5);
    const remaining = newDeck.slice(5);

    // Compute GTO Hold recommendation instantly
    const optimal = getOptimalHolds(dealtHand);

    setDeck(remaining);
    setHand(dealtHand);
    setOptimalHolds(optimal.holds);
    setCoachSuggestion(optimal.holds);
    setGameState("DEALT");
  }, [balance, bet]);

  // Handle Draw (0 network calls, < 1ms)
  const handleDraw = useCallback(() => {
    if (gameState !== "DEALT") return;

    const finalHand = [...hand];
    let deckIndex = 0;
    const currentDeck = [...deck];

    // Replace unheld cards
    for (let i = 0; i < 5; i++) {
      if (!holds.includes(i)) {
        finalHand[i] = currentDeck[deckIndex++];
      }
    }

    // Evaluate final rank & payout
    const finalRank = evaluateHandRank(finalHand as Card[]);
    const payout = calculatePayout(finalRank, bet);

    // Calculate Accuracy vs GTO
    const isMatch =
      holds.length === optimalHolds.length &&
      holds.every((idx) => optimalHolds.includes(idx));
    const currentAcc = isMatch
      ? 100
      : Math.max(
          10,
          100 - (5 - holds.filter((h) => optimalHolds.includes(h)).length) * 25,
        );

    const heldCards = holds.map((i) => hand[i] as Card);
    const optCards = optimalHolds.map((i) => hand[i] as Card);

    const commentary = getCoachCommentary(
      persona,
      currentAcc,
      payout,
      heldCards,
      optCards,
    );

    // Update State
    setHand(finalHand);
    setResultRank(finalRank);
    setPayoutWon(payout);
    setBalance((prev) => prev + payout);
    setCoachCommentary(commentary);
    setHandAccuracy(currentAcc);
    setAccuracyHistory((prev) => [...prev, currentAcc]);
    setGameState("FINISHED");

    // --- ANALYTICS INSTRUMENTATION ---
  sessionHandsRef.current += 1;
  sessionAccHistoryRef.current.push(currentAcc);

  const totalSessionHands = sessionHandsRef.current;
  const rollingAvgAcc = Math.round(
    sessionAccHistoryRef.current.reduce((a, b) => a + b, 0) / sessionAccHistoryRef.current.length
  );

  // Event A: Hand Completed
  trackEvent("Hand Completed", {
    rank: finalRank,
    bet: bet,
    payout: payout,
    gto_accuracy: currentAcc,
    is_optimal: isMatch,
    persona: persona,
  });

  // Event B: Retention / Milestone Engagement
  if ([10, 25, 50, 100, 250].includes(totalSessionHands)) {
    trackEvent("Hand Milestone Reached", {
      hands_played: totalSessionHands,
      avg_accuracy: rollingAvgAcc,
    });
  }
  }, [gameState, hand, holds, deck, bet, optimalHolds, persona]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement?.tagName.toLowerCase();
      if (target === "input" || target === "textarea" || target === "select")
        return;

      if (showRulesModal || showResetModal) {
        if (e.key === "Escape") {
          setShowRulesModal(false);
          setShowResetModal(false);
        }
        return;
      }

      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        toggleHold(parseInt(e.key, 10) - 1);
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (gameState === "DEALT") handleDraw();
        else handleDeal();
      }

      if (showRulesModal || showResetModal || showLegalModal) {
        if (e.key === "Escape") {
          setShowRulesModal(false);
          setShowResetModal(false);
          setShowLegalModal(false);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    gameState,
    showRulesModal,
    showResetModal,
    toggleHold,
    handleDraw,
    handleDeal,
  ]);

  const handleReset = () => {
    setBalance(INITIAL_BANKROLL);
    setAccuracyHistory([]);
    setSessionAverage(100);
    setHandAccuracy(null);
    setPayoutWon(null);
    setResultRank(null);
    setCoachCommentary(null);
    setShowResetModal(false);
    localStorage.setItem(STORAGE_KEYS.BANKROLL, INITIAL_BANKROLL.toString());
    localStorage.removeItem(STORAGE_KEYS.ACCURACY_HISTORY);
  };

  // 3. Track Session End / Retention on page unload
useEffect(() => {
  const handleBeforeUnload = () => {
    if (sessionHandsRef.current > 0) {
      const avg = Math.round(
        sessionAccHistoryRef.current.reduce((a, b) => a + b, 0) /
          sessionAccHistoryRef.current.length
      );
      trackEvent("Session Ended", {
        total_hands: sessionHandsRef.current,
        session_avg_accuracy: avg,
      });
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, []);

  return (
    <main className='h-dvh h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none touch-manipulation font-sans'>
      {/* 1. HUD: Static Height (52px) */}
      <header className='h-[52px] flex-none px-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10'>
        <div className='flex items-center gap-2'>
          <div className='flex flex-col'>
            <span className='text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none'>
              Bankroll
            </span>
            <span className='text-base font-black text-emerald-400 leading-tight'>
              ${isHydrated ? balance : INITIAL_BANKROLL}
            </span>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            aria-label='Reset Bankroll and Session Stats'
            className='p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 active:scale-95 transition'
          >
            <svg
              className='w-3.5 h-3.5'
              aria-hidden='true'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2.5'
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </button>
        </div>

        {/* Accuracy Tracker */}
        <div
          className='flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg'
          aria-label={`Session GTO Accuracy: ${sessionAverage}%`}
        >
          <span className='text-[10px] uppercase font-bold text-slate-400'>
            GTO Acc
          </span>
          <span
            className={`text-xs font-black ${sessionAverage >= 90 ? "text-emerald-400" : sessionAverage >= 70 ? "text-amber-400" : "text-rose-400"}`}
          >
            {sessionAverage}%
          </span>
        </div>

        {/* Persona & Guide */}
        <div className='flex items-center gap-1.5'>
          <label htmlFor='persona-select' className='sr-only'>
            Choose AI Coach Persona
          </label>
          <select
            id='persona-select'
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className='text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400'
          >
            <option value='vegas_pro'>Vegas Pro</option>
            <option value='math_prof'>Professor</option>
            <option value='hype_man'>Hype Man</option>
          </select>

          <button
            type='button'
            onClick={() => setShowRulesModal(true)}
            aria-label='Open 9/6 Paytable and Game Rules'
            className='w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 font-bold text-xs flex items-center justify-center border border-slate-700 transition active:scale-95'
          >
            ℹ️
          </button>
        </div>
      </header>

      {/* 2. OUTCOME & COACH COMMENTARY: Fixed Reserved Height (68px) to Prevent CLS */}
      <section
        className='h-[68px] flex-none px-4 flex flex-col items-center justify-center text-center overflow-hidden'
        aria-live='polite'
      >
        <div className='h-6 flex items-center justify-center gap-2'>
          {resultRank ? (
            <>
              <span className='text-xs font-black tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
                {resultRank.replace(/_/g, " ")}
              </span>
              {payoutWon !== null && payoutWon > 0 && (
                <span className='text-xs font-black text-amber-300'>
                  +{payoutWon} chips
                </span>
              )}
            </>
          ) : (
            <span className='text-[11px] uppercase tracking-widest text-slate-500 font-semibold'>
              {gameState === "DEALT"
                ? "Select holds then draw"
                : "Select coins and deal"}
            </span>
          )}
        </div>

        <div className='h-8 flex items-center justify-center w-full max-w-md'>
          {coachCommentary ? (
            <p className='text-[11px] sm:text-xs text-slate-300 font-medium truncate px-2 py-0.5 bg-slate-900/60 rounded border border-slate-800/60 w-full'>
              "{coachCommentary}"
            </p>
          ) : (
            <div className='w-16 h-1 bg-slate-800/40 rounded-full' />
          )}
        </div>
      </section>

      {/* 3. CARD CONTAINER: Strict Geometry Reservation (CLS = 0) */}
      <section className='flex-1 w-full max-w-xl mx-auto px-2 flex items-center justify-center'>
        <div className='grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full'>
          {hand.map((card, idx) => {
            const isHeld = holds.includes(idx);
            const isSuggested =
              coachSuggestion.includes(idx) && gameState === "DEALT";
            const suit = card
              ? SUIT_META[card.suit] || {
                  symbol: card.suit,
                  color: "text-slate-100",
                  name: card.suit,
                }
              : null;
            const cardLabel = card
              ? `${card.value} of ${suit?.name}`
              : `Card ${idx + 1} empty`;

            return (
              <button
                key={idx}
                type='button'
                role='button'
                aria-pressed={isHeld}
                aria-label={`${cardLabel}${isHeld ? " (Held)" : ""}${isSuggested ? " (Optimal play)" : ""}`}
                disabled={gameState !== "DEALT"}
                onClick={() => toggleHold(idx)}
                className={`relative flex flex-col justify-between items-center rounded-xl p-1 sm:p-2.5 select-none w-full
                  aspect-[2/3] max-h-48 sm:max-h-56
                  transition-transform duration-100 will-change-transform
                  ${gameState === "DEALT" ? "cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400" : "cursor-default"}
                  ${isHeld ? "bg-slate-800 border-2 border-emerald-400 shadow-md shadow-emerald-500/20 -translate-y-2.5" : "bg-slate-900 border border-slate-800"}
                  ${!card ? "border-dashed border-slate-800/60 bg-slate-950/30" : ""}
                `}
              >
                {/* Hold Status Badge: Fixed height */}
                <div className='h-4 flex items-center justify-center'>
                  <span
                    className={`text-[10px] sm:text-xs font-black tracking-wider uppercase px-1 rounded transition-opacity duration-100 ${isHeld ? "bg-emerald-400 text-slate-950 opacity-100" : "opacity-0"}`}
                  >
                    HELD
                  </span>
                </div>

                {/* Card Face & Suit */}
                {card && suit ? (
                  <div className='flex flex-col items-center'>
                    <span
                      className={`text-base sm:text-2xl font-black ${suit.color} leading-none tracking-tight`}
                    >
                      {card.value}
                    </span>
                    <span
                      className={`text-xl sm:text-3xl ${suit.color} leading-none mt-0.5`}
                    >
                      {suit.symbol}
                    </span>
                  </div>
                ) : (
                  <div className='w-5 h-8 rounded border border-slate-800/40 opacity-20 my-auto' />
                )}

                {/* GTO Badge + Hotkey Tag: Fixed height */}
                <div className='h-4 flex items-center justify-center gap-1'>
                  {isSuggested && (
                    <span className='text-[9px] font-bold text-amber-300 uppercase tracking-tighter bg-amber-500/10 px-1 rounded border border-amber-500/20'>
                      ★ GTO
                    </span>
                  )}
                  <span className='hidden sm:inline-block text-[9px] font-mono text-slate-500 bg-slate-950/80 px-1 rounded border border-slate-800'>
                    [{idx + 1}]
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. CONTROLS: Strict Height (128px) */}
      <footer className='h-[128px] flex-none w-full max-w-xl mx-auto px-3 pb-3 flex flex-col justify-end space-y-2'>
        {/* Bet Stepper */}
        <div className='flex items-center justify-between gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl'>
          <span className='text-[10px] uppercase font-bold text-slate-400 pl-2'>
            Bet Coins
          </span>
          <div
            className='flex gap-1'
            role='radiogroup'
            aria-label='Bet level in coins'
          >
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type='button'
                role='radio'
                aria-checked={bet === lvl}
                disabled={gameState === "DEALT"}
                onClick={() => setBet(lvl)}
                className={`w-9 h-7 rounded-lg text-xs font-extrabold transition-colors ${
                  bet === lvl
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {gameState === "DEALT" ? (
          <button
            type='button'
            onClick={handleDraw}
            className='w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-transform flex items-center justify-center gap-2'
          >
            <span>Draw Replacements</span>
            <span className='text-xs bg-black/10 px-2 py-0.5 rounded font-bold'>
              ({5 - holds.length} New)
            </span>
            <span className='hidden sm:inline-block text-[10px] font-mono bg-black/20 text-slate-950 px-1.5 py-0.5 rounded ml-1'>
              SPACE
            </span>
          </button>
        ) : (
          <button
            type='button'
            onClick={handleDeal}
            className='w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-transform flex items-center justify-center gap-2'
          >
            <span>Deal Hand</span>
            <span className='text-xs bg-black/10 px-2 py-0.5 rounded font-bold'>
              ${bet}
            </span>
            <span className='hidden sm:inline-block text-[10px] font-mono bg-black/20 text-slate-950 px-1.5 py-0.5 rounded ml-1'>
              SPACE
            </span>
          </button>
        )}
        {/* Compact Disclaimer Bar (< 22px high, zero CLS) */}
        <div className='flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-900'>
          <div className='flex items-center gap-1.5 truncate'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block' />
            <span className='truncate'>
              100% Free Simulator &bull; No Real Money
            </span>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            <a
              href='https://www.ncpgambling.org'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-slate-300 transition'
            >
              NCPG
            </a>
            <span>&bull;</span>
            <a
              href='https://www.begambleaware.org'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-slate-300 transition'
            >
              BeGambleAware
            </a>
            <span>&bull;</span>
            <button
              type='button'
              onClick={() => setShowLegalModal(true)}
              className='hover:text-emerald-400 font-medium underline transition'
            >
              Terms & Rules
            </button>
          </div>
        </div>
      </footer>

      {/* Mount LegalModal */}
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />

      {/* Dialogs */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        currentBet={bet}
      />

      {showResetModal && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='reset-title'
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'
        >
          <div className='bg-slate-900 border border-slate-800 rounded-2xl max-w-xs w-full p-5 text-center space-y-3 shadow-2xl'>
            <h3 id='reset-title' className='text-base font-bold text-white'>
              Reset Bankroll?
            </h3>
            <p className='text-xs text-slate-400'>
              Restores bankroll to{" "}
              <span className='text-emerald-400 font-bold'>$1,000</span> and
              clears session history.
            </p>
            <div className='grid grid-cols-2 gap-2 pt-1'>
              <button
                type='button'
                onClick={() => setShowResetModal(false)}
                className='py-2 text-xs font-semibold rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleReset}
                className='py-2 text-xs font-bold rounded-lg text-slate-950 bg-emerald-500 hover:bg-emerald-400'
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
