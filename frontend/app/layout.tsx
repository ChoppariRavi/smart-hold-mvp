// frontend/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Hold Poker - 9/6 Jacks or Better GTO Trainer",
  description: "Fast, deterministic video poker trainer with zero house edge GTO guidance.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Keep accessible (do not lock user scaling entirely)
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Plausible Analytics (< 1KB, Cookie-free, Privacy-first) */}
        <Script
          defer
          data-domain="smartholdpoker.com"
          src="https://plausible.io/js/script.tagged-events.js"
          strategy="afterInteractive"
        />
        {/* If using Umami instead, uncomment this:
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="YOUR-UMAMI-WEBSITE-ID"
          strategy="afterInteractive"
        /> */}
      <body className="antialiased bg-slate-950 overflow-hidden">{children}</body>
    </html>
  );
}