import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono, VT323, UnifrakturCook } from 'next/font/google';

export const fontSans = GeistSans;

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const fontDisplay = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

// Blackletter — Foil brand wordmark ("Mn$tr").
export const fontBlackletter = UnifrakturCook({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-blackletter',
  display: 'swap',
});

export const fontClasses = `${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontBlackletter.variable}`;
