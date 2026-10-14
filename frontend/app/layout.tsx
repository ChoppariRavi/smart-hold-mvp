// frontend/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
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
      <body className="antialiased bg-slate-950 overflow-hidden">{children}</body>
    </html>
  );
}