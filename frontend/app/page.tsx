"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import RulesModal from "./components/RulesModal";
import LegalModal from "./components/LegalModal";
import {
  Card,
  generateDeck,
  evaluateHandRank,
  calculatePayout,
  getOptimalHolds,
  getCoachCommentary,
} from "./core/pokerEngine";
import { trackEvent } from "./lib/analytics";

const STORAGE_KEYS = {
  BANKROLL: "shp_bankroll",
  ACCURACY_HISTORY: "shp_accuracy_history",
  PERSONA: "shp_persona",
  BET: "shp_current_bet",
  THEME: "shp_theme",
};

const INITIAL_BANKROLL = 1000;
const INITIAL_PERSONA = "vegas_pro";

const SUIT_META: Record<
  string,
  { symbol: string; darkColor: string; lightColor: string; name: string }
> = {
  H: { symbol: "♥", darkColor: "text-rose-400", lightColor: "text-rose-600", name: "Hearts" },
  HEARTS: { symbol: "♥", darkColor: "text-rose-400", lightColor: "text-rose-600", name: "Hearts" },
  D: { symbol: "♦", darkColor: "text-blue-400", lightColor: "text-blue-600", name: "Diamonds" },
  DIAMONDS: { symbol: "♦", darkColor: "text-blue-400", lightColor: "text-blue-600", name: "Diamonds" },
  C: { symbol: "♣", darkColor: "text-emerald-400", lightColor: "text-emerald-700", name: "Clubs" },
  CLUBS: { symbol: "♣", darkColor: "text-emerald-400", lightColor: "text-emerald-700", name: "Clubs" },
  S: { symbol: "♠", darkColor: "text-slate-100", lightColor: "text-slate-900", name: "Spades" },
  SPADES: { symbol: "♠", darkColor: "text-slate-100", lightColor: "text-slate-900", name: "Spades" },
};

export default function PokerGame() {
  const [hand, setHand] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [holds, setHolds] = useState<number[]>([]);
  const [coachSuggestion, setCoachSuggestion] = useState<number[]>([]);
  const [gameState, setGameState] = useState<"IDLE" | "DEAL_ANIMATING" | "DEALT" | "FINISHED">("IDLE");

  // Sequential Dispatch State
  const [activeDispatchIdx, setActiveDispatchIdx] = useState<number>(-1);
  const dispatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent States
  const [balance, setBalance] = useState<number>(INITIAL_BANKROLL);
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([]);
  const [sessionAverage, setSessionAverage] = useState<number>(100);
  const [persona, setPersona] = useState<string>(INITIAL_PERSONA);
  const [bet, setBet] = useState<number>(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Round Results
  const [handAccuracy, setHandAccuracy] = useState<number | null>(null);
  const [payoutWon, setPayoutWon] = useState<number | null>(null);
  const [resultRank, setResultRank] = useState<string | null>(null);
  const [coachCommentary, setCoachCommentary] = useState<string | null>(null);

  // Modals & Hydration
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Game Engine Internal State
  const [deck, setDeck] = useState<Card[]>([]);
  const [optimalHolds, setOptimalHolds] = useState<number[]>([]);

  // Session Tracking Refs
  const sessionHandsRef = useRef<number>(0);
  const sessionAccHistoryRef = useRef<number[]>([]);

  // 1. Hydration & Initial Load
  useEffect(() => {
    try {
      const savedBalance = localStorage.getItem(STORAGE_KEYS.BANKROLL);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.ACCURACY_HISTORY);
      const savedPersona = localStorage.getItem(STORAGE_KEYS.PERSONA);
      const savedBet = localStorage.getItem(STORAGE_KEYS.BET);
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as "dark" | "light" | null;

      if (savedBalance !== null) setBalance(Number(savedBalance) || INITIAL_BANKROLL);
      if (savedHistory !== null) {
        const hist = JSON.parse(savedHistory);
        if (Array.isArray(hist) && hist.length > 0) {
          setAccuracyHistory(hist);
          setSessionAverage(Math.round(hist.reduce((a, b) => a + b, 0) / hist.length));
        }
      }
      if (savedPersona) setPersona(savedPersona);
      if (savedBet !== null) setBet(Number(savedBet) || 1);

      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        setTheme("light");
      }
    } catch {
      // Graceful fallback for storage blocks
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Sync Theme to Document Root
  useEffect(() => {
    if (!isHydrated) return;
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme, isHydrated]);

  // 3. Storage Syncing
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.BANKROLL, balance.toString());
  }, [balance, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.ACCURACY_HISTORY, JSON.stringify(accuracyHistory));
    if (accuracyHistory.length > 0) {
      setSessionAverage(
        Math.round(accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length)
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleHold = useCallback(
    (index: number) => {
      if (gameState !== "DEALT") return;
      setHolds((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    },
    [gameState]
  );

  // Sequential Card Dispatcher (180ms per card = authentic rhythm without being sluggish)
  const dispatchSequentialCards = (newHand: Card[], optimal: number[]) => {
    setGameState("DEAL_ANIMATING");
    setHand([null, null, null, null, null]);
    setActiveDispatchIdx(0);

    let currentCard = 0;
    if (dispatchIntervalRef.current) clearInterval(dispatchIntervalRef.current);

    dispatchIntervalRef.current = setInterval(() => {
      setHand((prev) => {
        const next = [...prev];
        next[currentCard] = newHand[currentCard];
        return next;
      });

      currentCard++;
      setActiveDispatchIdx(currentCard);

      if (currentCard >= 5) {
        if (dispatchIntervalRef.current) clearInterval(dispatchIntervalRef.current);
        setActiveDispatchIdx(-1);
        setCoachSuggestion(optimal);
        setGameState("DEALT");
      }
    }, 180);
  };

  // --- ROBUST DEAL DISPATCHER (STRICT 5 CARDS + LOADING STATE) ---
  const handleDeal = useCallback(() => {
    if (gameState === "DEAL_ANIMATING") return;
    if (balance < bet) {
      setShowResetModal(true);
      return;
    }

    // 1. Clear previous interval if still running
    if (dispatchIntervalRef.current) {
      clearInterval(dispatchIntervalRef.current);
      dispatchIntervalRef.current = null;
    }

    // 2. Clear state and show deal loading
    setBalance((prev) => prev - bet);
    setCoachCommentary(null);
    setPayoutWon(null);
    setResultRank(null);
    setHandAccuracy(null);
    setHolds([]);
    setCoachSuggestion([]);
    setGameState("DEAL_ANIMATING");

    // 3. Generate Deck
    const newDeck = generateDeck();
    const dealtHand = newDeck.slice(0, 5); // Strictly 5 cards
    const remainingDeck = newDeck.slice(5);
    setDeck(remainingDeck);

    // Initialise exactly 5 slots to null
    setHand([null, null, null, null, null]);
    setActiveDispatchIdx(0);

    let cardIdx = 0;
    const tempHand: (Card | null)[] = [null, null, null, null, null];

    // Fast, crisp card flip cadence (90ms per card)
    dispatchIntervalRef.current = setInterval(() => {
      if (cardIdx < 5) {
        tempHand[cardIdx] = dealtHand[cardIdx];
        setHand([...tempHand]);
        setActiveDispatchIdx(cardIdx);
        cardIdx++;
      } else {
        // Complete dealing sequence
        if (dispatchIntervalRef.current) {
          clearInterval(dispatchIntervalRef.current);
          dispatchIntervalRef.current = null;
        }
        setActiveDispatchIdx(-1);

        // Yield GTO Solver execution to next microtask to prevent UI freeze
        setTimeout(() => {
          const optimal = getOptimalHolds(dealtHand);
          setOptimalHolds(optimal.holds);
          setCoachSuggestion(optimal.holds);
          setGameState("DEALT");
        }, 30);
      }
    }, 90);
  }, [balance, bet, gameState]);

  // Handle Draw
  const handleDraw = useCallback(() => {
    if (gameState !== "DEALT") return;

    const finalHand = [...hand];
    let deckIndex = 0;
    const currentDeck = [...deck];

    for (let i = 0; i < 5; i++) {
      if (!holds.includes(i)) {
        finalHand[i] = currentDeck[deckIndex++];
      }
    }

    const finalRank = evaluateHandRank(finalHand as Card[]);
    const payout = calculatePayout(finalRank, bet);

    const isMatch =
      holds.length === optimalHolds.length &&
      holds.every((idx) => optimalHolds.includes(idx));
    const currentAcc = isMatch
      ? 100
      : Math.max(10, 100 - (5 - holds.filter((h) => optimalHolds.includes(h)).length) * 25);

    const heldCards = holds.map((i) => hand[i] as Card);
    const optCards = optimalHolds.map((i) => hand[i] as Card);
    const commentary = getCoachCommentary(persona, currentAcc, payout, heldCards, optCards);

    setHand(finalHand);
    setResultRank(finalRank);
    setPayoutWon(payout);
    setBalance((prev) => prev + payout);
    setCoachCommentary(commentary);
    setHandAccuracy(currentAcc);
    setAccuracyHistory((prev) => [...prev, currentAcc]);
    setGameState("FINISHED");

    sessionHandsRef.current += 1;
    sessionAccHistoryRef.current.push(currentAcc);
    const totalSessionHands = sessionHandsRef.current;
    const rollingAvgAcc = Math.round(
      sessionAccHistoryRef.current.reduce((a, b) => a + b, 0) /
        sessionAccHistoryRef.current.length
    );

    trackEvent("Hand Completed", {
      rank: finalRank,
      bet,
      payout,
      gto_accuracy: currentAcc,
      is_optimal: isMatch,
      persona,
    });

    if ([10, 25, 50, 100, 250].includes(totalSessionHands)) {
      trackEvent("Hand Milestone Reached", {
        hands_played: totalSessionHands,
        avg_accuracy: rollingAvgAcc,
      });
    }
  }, [gameState, hand, holds, deck, bet, optimalHolds, persona]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement?.tagName.toLowerCase();
      if (target === "input" || target === "textarea" || target === "select") return;

      if (showRulesModal || showResetModal || showLegalModal) {
        if (e.key === "Escape") {
          setShowRulesModal(false);
          setShowResetModal(false);
          setShowLegalModal(false);
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
        else if (gameState !== "DEAL_ANIMATING") handleDeal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, showRulesModal, showResetModal, showLegalModal, toggleHold, handleDraw, handleDeal]);

  // Session Exit Tracking
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

  const isLight = theme === "light";

  return (
    <main
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none touch-manipulation font-sans transition-colors duration-200 ${
        isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      {/* 1. HUD: Responsive Header (Fits small mobile screens without overflow) */}
      <header
        className={`h-12 flex-none px-2 sm:px-3 border-b flex items-center justify-between z-10 transition-colors gap-1 sm:gap-2 ${
          isLight ? "bg-white/95 border-slate-200 shadow-xs" : "bg-slate-900/90 border-slate-800"
        }`}
      >
        {/* Left: Bankroll & Reset */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none">
              Bank
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-500 leading-tight">
              ${isHydrated ? balance : INITIAL_BANKROLL}
            </span>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            aria-label="Reset Bankroll"
            className={`p-1 rounded active:scale-95 transition ${
              isLight
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-slate-800 text-slate-300 hover:text-emerald-400"
            }`}
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Center: GTO Accuracy */}
        <div
          className={`flex items-center gap-1 border px-1.5 py-0.5 rounded-md shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
          }`}
        >
          <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400">GTO</span>
          <span
            className={`text-xs font-black ${
              sessionAverage >= 90 ? "text-emerald-500" : sessionAverage >= 70 ? "text-amber-500" : "text-rose-500"
            }`}
          >
            {sessionAverage}%
          </span>
        </div>

        {/* Right: Theme Toggle, Persona Select & Info Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Dark/Light Mode"
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded border text-xs transition active:scale-95 shrink-0 ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:text-amber-300"
            }`}
          >
            {isLight ? "🌙" : "☀️"}
          </button>

          {/* Persona Dropdown (Compact width on small screens) */}
          <label htmlFor="persona-select" className="sr-only">Choose AI Coach Persona</label>
          <select
            id="persona-select"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className={`text-[11px] sm:text-xs border rounded px-1 py-1 font-semibold focus:outline-none max-w-[80px] sm:max-w-none ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                : "bg-slate-800 border-slate-700 text-slate-200 focus:ring-1 focus:ring-emerald-400"
            }`}
          >
            <option value="vegas_pro">Vegas</option>
            <option value="math_prof">Prof</option>
            <option value="hype_man">Hype</option>
          </select>

          {/* Guide / Info Button (shrink-0 prevents it from being pushed off-screen) */}
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            aria-label="Open 9/6 Paytable and Game Rules"
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded border font-bold text-xs flex items-center justify-center shrink-0 transition active:scale-95 ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:text-emerald-400"
            }`}
          >
            ℹ️
          </button>
        </div>
      </header>

      {/* 2. OUTCOME & COACH COMMENTARY: Fixed 54px Area */}
      <section className="h-[54px] flex-none px-3 flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="h-5 flex items-center justify-center gap-2">
          {gameState === "DEAL_ANIMATING" ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 animate-pulse">
              Dispatching Cards...
            </span>
          ) : resultRank ? (
            <>
              <span className="text-[11px] font-black tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                {resultRank.replace(/_/g, " ")}
              </span>
              {payoutWon !== null && payoutWon > 0 && (
                <span className="text-xs font-black text-amber-500">+{payoutWon} chips</span>
              )}
            </>
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {gameState === "DEALT" ? "Tap cards to hold, then draw" : "Select coins and deal"}
            </span>
          )}
        </div>

        <div className="h-7 flex items-center justify-center w-full max-w-md">
          {coachCommentary ? (
            <p
              className={`text-[11px] font-medium truncate px-2.5 py-0.5 rounded border w-full ${
                isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              {coachCommentary}
            </p>
          ) : (
            <div className="w-12 h-1 bg-slate-400/20 rounded-full" />
          )}
        </div>
      </section>

      {/* 3. CARD CONTAINER: Strict 5-Column Grid */}
      <section className="flex-1 w-full max-w-xl mx-auto px-2 flex items-center justify-center min-h-0">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full">
          {hand.slice(0, 5).map((card, idx) => {
            const isHeld = holds.includes(idx);
            const isSuggested = coachSuggestion.includes(idx) && gameState === "DEALT";
            const isDealingCurrent = activeDispatchIdx === idx;
            const suit = card ? SUIT_META[card.suit] : null;

            return (
              <button
                key={idx}
                type="button"
                disabled={gameState !== "DEALT"}
                onClick={() => toggleHold(idx)}
                className={`relative flex flex-col justify-between items-center rounded-xl p-1 sm:p-2 w-full
                  aspect-[2/3] max-h-44 sm:max-h-52 select-none
                  transition-all duration-150 transform-gpu
                  ${gameState === "DEALT" ? "cursor-pointer active:scale-95" : "cursor-default"}
                  ${
                    isHeld
                      ? isLight
                        ? "bg-emerald-50 border-2 border-emerald-500 shadow-md -translate-y-2"
                        : "bg-slate-800 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 -translate-y-2"
                      : isLight
                      ? "bg-white border border-slate-200 shadow-xs"
                      : "bg-slate-900 border border-slate-800"
                  }
                  ${isDealingCurrent ? "border-emerald-400 scale-105 shadow-md shadow-emerald-500/20" : ""}
                  ${!card ? (isLight ? "bg-slate-100/80 border border-slate-200" : "bg-slate-900/40 border border-slate-800/80") : ""}
                `}
              >
                {/* Hold Tag */}
                <div className="h-4 flex items-center justify-center">
                  <span
                    className={`text-[9px] sm:text-[10px] font-black tracking-wider uppercase px-1 rounded transition-opacity duration-100 ${
                      isHeld
                        ? isLight
                          ? "bg-emerald-600 text-white opacity-100"
                          : "bg-emerald-400 text-slate-950 opacity-100"
                        : "opacity-0"
                    }`}
                  >
                    HELD
                  </span>
                </div>

                {/* Card Face / Dealing Placeholder */}
                {card && suit ? (
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-base sm:text-2xl font-black ${
                        isLight ? suit.lightColor : suit.darkColor
                      } leading-none tracking-tight`}
                    >
                      {card.value}
                    </span>
                    <span
                      className={`text-xl sm:text-3xl ${
                        isLight ? suit.lightColor : suit.darkColor
                      } leading-none mt-0.5`}
                    >
                      {suit.symbol}
                    </span>
                  </div>
                ) : (
                  /* Animated Card Back Skeleton */
                  <div className="flex flex-col items-center justify-center my-auto">
                    <div
                      className={`w-6 h-9 sm:w-8 sm:h-12 rounded-md border flex items-center justify-center transition-all ${
                        isDealingCurrent
                          ? "border-emerald-500/50 bg-emerald-500/10 animate-pulse scale-110"
                          : isLight
                          ? "border-slate-300/60 bg-slate-200/50"
                          : "border-slate-700/60 bg-slate-800/50"
                      }`}
                    >
                      <span className="text-xs font-mono font-bold text-slate-400 opacity-60">♠</span>
                    </div>
                  </div>
                )}

                {/* Hotkey / GTO Tag */}
                <div className="h-4 flex items-center justify-center gap-1">
                  {isSuggested && (
                    <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-1 rounded border border-amber-500/20">
                      ★ GTO
                    </span>
                  )}
                  <span className="hidden sm:inline-block text-[8px] font-mono text-slate-400 opacity-60">
                    [{idx + 1}]
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. CONTROLS FOOTER: Compact, Self-Contained & Mobile Safe-Area Protected */}
      <footer
        className={`flex-none w-full max-w-xl mx-auto px-3 pt-1 space-y-1.5 transition-colors ${
          isLight ? "bg-slate-100/95 border-t border-slate-200" : "bg-slate-950/95 border-t border-slate-900"
        }`}
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {/* Bet Stepper */}
        <div
          className={`flex h-8 items-center justify-between gap-1 border p-0.5 rounded-lg ${
            isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
          }`}
        >
          <span className="text-[9px] uppercase font-bold text-slate-400 pl-2">Bet Coins</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Bet level">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={gameState === "DEALT" || gameState === "DEAL_ANIMATING"}
                onClick={() => setBet(lvl)}
                className={`w-8 h-6 rounded text-xs font-black transition-colors ${
                  bet === lvl
                    ? isLight
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-500 text-slate-950"
                    : isLight
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Button (Fixed 44px standard touch height) */}
        {/* Primary Action Button */}
        <div className="h-11">
          {gameState === "DEAL_ANIMATING" ? (
            <button
              disabled
              className={`w-full h-full rounded-xl border flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wider ${
                isLight ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Dealing Cards...</span>
            </button>
          ) : gameState === "DEALT" ? (
            <button
              type="button"
              onClick={handleDraw}
              className="w-full h-full rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2"
            >
              <span>Draw Cards</span>
              <span className="text-xs bg-black/10 px-2 py-0.5 rounded font-bold">
                ({5 - holds.length} New)
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono bg-black/20 text-slate-950 px-1.5 py-0.5 rounded ml-1">
                SPACE
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeal}
              className={`w-full h-full rounded-xl font-black text-sm uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 active:scale-[0.98] ${
                isLight
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
              }`}
            >
              <span>Deal Hand</span>
              <span className="text-xs bg-black/10 px-2 py-0.5 rounded font-bold">${bet}</span>
              <span className="hidden sm:inline-block text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded ml-1">
                SPACE
              </span>
            </button>
          )}
        </div>

        {/* Legal Disclaimer Line */}
        <div className="flex h-4 items-center justify-between text-[9px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span className="truncate">Free Simulator &bull; No Real Money</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-200">
              NCPG
            </a>
            <span>&bull;</span>
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-200">
              BeGambleAware
            </a>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              className="text-emerald-500 hover:underline font-semibold"
            >
              Terms
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} currentBet={bet} />
      <LegalModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} />

      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div
            className={`border rounded-2xl max-w-xs w-full p-5 text-center space-y-3 shadow-2xl ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Reset Bankroll?
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Restores bankroll to <span className="text-emerald-500 font-bold">$1,000</span> and clears accuracy session history.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className={`py-2 text-xs font-semibold rounded-lg ${
                  isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-2 text-xs font-bold rounded-lg text-slate-950 bg-emerald-500 hover:bg-emerald-400"
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