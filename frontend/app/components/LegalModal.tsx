"use client";

import React, { useState } from "react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalModal({ isOpen, onClose }: LegalModalProps) {
  const [tab, setTab] = useState<"terms" | "disclaimer" | "responsible">("disclaimer");

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <span id="legal-modal-title" className="text-emerald-400 font-black text-sm sm:text-base">
              Smart Hold Poker
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Legal & Compliance
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close legal modal"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Strip */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-bold text-center bg-slate-900/90">
          <button
            onClick={() => setTab("disclaimer")}
            className={`py-2.5 transition border-b-2 ${
              tab === "disclaimer"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Disclaimer
          </button>
          <button
            onClick={() => setTab("responsible")}
            className={`py-2.5 transition border-b-2 ${
              tab === "responsible"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Responsible Play
          </button>
          <button
            onClick={() => setTab("terms")}
            className={`py-2.5 transition border-b-2 ${
              tab === "terms"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Terms of Service
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-300 text-xs leading-relaxed">
          {/* TAB 1: DISCLAIMER */}
          {tab === "disclaimer" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                <div className="font-extrabold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span>🛡️</span> 100% Free Educational Simulation
                </div>
                <p className="text-[11px] leading-relaxed">
                  Smart Hold Poker is exclusively an interactive training and probability learning utility. It is not an online casino, gambling operator, or real-money wagering platform.
                </p>
              </div>

              <div className="space-y-2 text-slate-300">
                <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wide">Key Clarifications:</h4>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li><strong className="text-slate-200">Zero Monetary Value:</strong> All credits, chips, bankrolls, and score multipliers are virtual simulation points. They cannot be purchased, deposited, withdrawn, redeemed, transferred, or exchanged for real currency or real-world goods.</li>
                  <li><strong className="text-slate-200">No House Edge Exploitation:</strong> Theoretical 99.54% GTO return calculations are derived strictly from combinatorics and mathematical game theory for educational demonstration only.</li>
                  <li><strong className="text-slate-200">No Success Guarantees:</strong> Proficiency or high accuracy scores achieved within this simulator do not correlate with, nor guarantee success in, real-money casino gaming.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: RESPONSIBLE GAMING */}
          {tab === "responsible" && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-300">
                If gambling is impacting your personal life, finances, or well-being, free and confidential support is available 24/7 through independent support networks:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* NCPG US */}
                <a
                  href="https://www.ncpgambling.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-400 transition">
                      NCPG (United States)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">National Council on Problem Gambling. Call or text 24/7.</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 mt-2">1-800-GAMBLER</span>
                </a>

                {/* BeGambleAware UK */}
                <a
                  href="https://www.begambleaware.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-400 transition">
                      BeGambleAware (UK)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Free, confidential advice and support for problem gambling.</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 mt-2">0808 8020 133</span>
                </a>

                {/* Gamblers Anonymous */}
                <a
                  href="https://www.gamblersanonymous.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-400 transition">
                      Gamblers Anonymous
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">International fellowship and local recovery meetings.</p>
                  </div>
                  <span className="text-[11px] text-emerald-400 mt-2 font-semibold">gamblersanonymous.org ↗</span>
                </a>

                {/* Tele-MANAS (India) */}
                <a
                  href="https://telemanas.mohfw.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-400 transition">
                      Tele-MANAS (India)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">National Tele Mental Health Programme of India (24/7 Toll-free).</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 mt-2">14416 / 1800-891-4416</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS OF SERVICE */}
          {tab === "terms" && (
            <div className="space-y-3 text-[11px] text-slate-400">
              <section className="space-y-1">
                <h4 className="font-bold text-slate-200">1. Acceptance of Terms</h4>
                <p>By accessing or using Smart Hold Poker, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.</p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-slate-200">2. Permitted Use</h4>
                <p>The application is provided exclusively for personal, non-commercial educational training in probability and decision mathematics. You may not scrape, reverse-engineer, or commercially redistribute the underlying engine without written permission.</p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-slate-200">3. Age Restriction</h4>
                <p>Although no real money is involved, this training software simulates games of chance and is intended strictly for users of legal age in their respective jurisdiction (18+ or 21+ where applicable).</p>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-slate-200">4. Disclaimer of Warranty & Liability</h4>
                <p>The software is provided &ldquo;as is&rdquo; without warranties of any kind. The creators accept no responsibility for real-world financial losses incurred at third-party gaming institutions.</p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95"
          >
            I Understand, Close
          </button>
        </div>
      </div>
    </div>
  );
}