import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono, VT323 } from 'next/font/google';

// Geist Sans — Foil body font.
export const fontSans = GeistSans;

// JetBrains Mono — universal mono / Arcade body.
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// VT323 — Arcade display font (CRT title bars, big numerics).
export const fontDisplay = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

export const fontClasses = `${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable}`;
