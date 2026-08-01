/* Shared display formatters. These used to be copy-pasted (with drift) into
 * ~two dozen components — this is the single home. Client- and server-safe:
 * no React, and everything is hard-coded en-US so SSR and hydration render
 * byte-for-byte identical output. Server-side/SQL formatting stays in
 * lib/queries — this file is only for what the user sees. */

/** "0x3c…39e1" — leading `chars` characters (the 0x counts) + last 4.
 * Default 4 everywhere; pass 6 only where the design deliberately wants the
 * longer form (wallet-detail header). */
export function shortAddr(a: string, chars = 4): string {
  return a.slice(0, chars) + '…' + a.slice(-4);
}

/** Compact relative time: "14s" / "3m" / "2h" / "5d". Rounds at each rung;
 * hours hand off to days at 48h so "37h" stays sharper than "2d" would be.
 * Uppercasing / " AGO"-suffixing happens at the call site
 * (`${agoShort(x).toUpperCase()} AGO`). */
export function agoShort(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Full USD: "$1,234" / "-$56.70" (`frac` decimals, en-US grouping).
 * Non-finite input renders as a dash. */
export function usd(n: number, frac = 0): string {
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

/** Abbreviated USD with the value and unit split so KPI tiles can render the
 * unit smaller ("$1.24"+"M", "$10.6"+"k"; below $1k it's plain usd() and no
 * unit). Negatives keep the sign on the value ("-$1.2"+"k"). */
export function abbrUsd(n: number): { value: string; unit?: string } {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return { value: `${sign}$${(abs / 1_000_000).toFixed(2)}`, unit: 'M' };
  if (abs >= 1_000)     return { value: `${sign}$${(abs / 1_000).toFixed(1)}`,    unit: 'k' };
  return { value: usd(n) };
}

/** abbrUsd joined into one string — for inline text where the split-unit
 * treatment doesn't apply ("$1.24M" / "-$10.6k"). */
export function abbrUsdStr(n: number): string {
  const a = abbrUsd(n);
  return a.value + (a.unit ?? '');
}

/** Explicit-sign USD for P&L figures: "+$123" / "-$45" (usd() already
 * carries the minus on negatives). */
export function signedUsd(n: number, frac = 0): string {
  return n >= 0 ? `+${usd(n, frac)}` : usd(n, frac);
}
