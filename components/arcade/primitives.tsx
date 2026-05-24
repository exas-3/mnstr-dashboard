/* Arcade CRT primitives, ported from design/arcade-core.jsx.
 *
 * Aesthetic: phosphor-green monochrome, ASCII box-drawing frames, block-char
 * progress bars, function-key segmented controls, VT323 display font for the
 * brand. Scanline + vignette overlays live in globals.css (.crt-overlay) and
 * are applied by RootLayout when data-theme === 'arcade'.
 */

import type { CSSProperties, ReactNode } from 'react';

export type Tier = 'Starter' | 'Premium' | 'Ultra' | 'Adventure';
export type Status = 'holding' | 'sold_back' | 'redeemed';

/* MnStr labels Premium as "Monster" in their UI — but Arcade uses 3-letter
 * codes everywhere, so this is `MON` here vs `Monster` in Foil. */
export function tierCode(tier: string): string {
  switch (tier) {
    case 'Starter':   return 'STA';
    case 'Premium':   return 'MON';
    case 'Ultra':     return 'ULT';
    case 'Adventure': return 'ADV';
    default:          return tier.slice(0, 3).toUpperCase();
  }
}

/* ─────────────────────────────────────────────────────────────
 * AsciiBox — bordered section with a ┌─ TITLE ──┐ header bar.
 * ───────────────────────────────────────────────────────────── */

export function AsciiBox({
  title,
  glow,
  right,
  children,
  className,
}: {
  title: string;
  glow?: boolean;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // Width of the title rule — clamped so it scales with mobile widths via CSS
  // (we render `─` chars but in a flex container so they collapse if narrow).
  const fill = Math.max(2, 34 - title.length);
  return (
    <div className={`mx-3.5 mt-3.5 ${className ?? ''}`} style={{ fontFamily: 'var(--font-mono)' }}>
      <div
        className="flex items-baseline gap-0 whitespace-pre"
        style={{
          color: 'var(--accent)',
          fontSize: 10,
          lineHeight: 1,
          textShadow: glow ? '0 0 8px color-mix(in oklch, var(--accent) 53%, transparent)' : 'none',
        }}
      >
        <span>{'┌─ '}</span>
        <span style={{ background: 'var(--bg)', padding: '0 2px' }}>{title}</span>
        <span className="flex-1 overflow-hidden">{' ' + '─'.repeat(fill) + '┐'}</span>
        {right && (
          <span
            className="ml-2 shrink-0"
            style={{ color: 'var(--fg-4)', fontSize: 9, letterSpacing: '0.1em' }}
          >
            {right}
          </span>
        )}
      </div>
      <div
        style={{
          padding: '10px 12px',
          border: '1px solid var(--accent)',
          borderTop: 'none',
          background: 'var(--bg-2)',
          boxShadow: glow
            ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), inset 0 0 24px color-mix(in oklch, var(--accent) 7%, transparent)'
            : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * AsciiBar — fixed-width block-char progress bar.
 * value is 0..100, width is the cell count.
 * ───────────────────────────────────────────────────────────── */

export function AsciiBar({
  value,
  width = 12,
  color = 'var(--accent)',
}: {
  value: number;
  width?: number;
  color?: string;
}) {
  const fill = Math.max(0, Math.min(width, Math.round((value / 100) * width)));
  const empty = width - fill;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0, color }}>
      {'█'.repeat(fill)}
      <span style={{ color: 'var(--fg-4)' }}>{'░'.repeat(empty)}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * AsciiHead — section head used outside of AsciiBox.
 * Renders "TAG :: TITLE             right"
 * ───────────────────────────────────────────────────────────── */

export function AsciiHead({
  tag,
  title,
  right,
}: {
  tag: string;
  title: string;
  right?: ReactNode;
}) {
  const cleanTag = tag.replace(/^\d+\s*::\s*/, '').replace(/^\d+\s*·\s*/, '');
  return (
    <div className="flex items-baseline gap-2 px-3.5 pt-4 pb-2" style={{ fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: 'var(--accent)', fontSize: 10, letterSpacing: '0.1em' }}>{cleanTag}</span>
      <span style={{ color: 'var(--fg-2)', fontSize: 10 }}>::</span>
      <span style={{ color: 'var(--fg-2)', fontSize: 11, letterSpacing: '0.04em' }}>{title}</span>
      {right && (
        <span className="ml-auto" style={{ color: 'var(--fg-4)', fontSize: 9, letterSpacing: '0.1em' }}>
          {right}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * AsciiKpi — phosphor-glow stat cell.
 * ───────────────────────────────────────────────────────────── */

export function AsciiKpi({
  label,
  value,
  delta,
  down,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  down?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--fg-4)',
        background: 'var(--bg-2)',
        padding: '8px 10px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ color: 'var(--fg-4)', fontSize: 8, letterSpacing: '0.14em' }}>{label}</div>
      <div
        style={{
          color: 'var(--accent)',
          fontSize: 16,
          marginTop: 4,
          textShadow: '0 0 6px color-mix(in oklch, var(--accent) 40%, transparent)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            color: down ? 'var(--negative)' : 'var(--fg-2)',
            fontSize: 9,
            marginTop: 2,
          }}
        >
          {down ? '▾' : '▴'} {delta}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Tier / Status pills
 * ───────────────────────────────────────────────────────────── */

const TIER_COLOR: Record<Tier, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',     // amber in arcade palette
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
};

export function AsciiTier({ tier, style }: { tier: Tier | string; style?: CSSProperties }) {
  const color = TIER_COLOR[tier as Tier] ?? 'var(--fg-3)';
  const code = tierCode(tier);
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.06em',
        padding: '1px 5px',
        border: `1px solid ${color}`,
        color,
        background: 'var(--bg)',
        ...style,
      }}
    >
      [{code}]
    </span>
  );
}

const STATUS_META: Record<Status, { color: string; text: string }> = {
  holding:   { color: 'var(--accent)',       text: 'HOLD' },
  sold_back: { color: 'var(--negative)',     text: 'SOLD' },
  redeemed:  { color: 'var(--tier-blue)',    text: 'RDM ' },
};

export function AsciiStatus({ status }: { status: Status | string }) {
  const m = (STATUS_META as Record<string, { color: string; text: string }>)[status] ?? {
    color: 'var(--fg-3)',
    text: '????',
  };
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: m.color,
        letterSpacing: '0.04em',
      }}
    >
      [{m.text}]
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * AsciiTimePivot — boxed [24H][7D][30D][ALL] segmented control.
 * URL-driven, takes a `build(value)` to compute the href per option.
 * ───────────────────────────────────────────────────────────── */

import Link from 'next/link';

export type AsciiWindow = '24H' | '7D' | '30D' | 'ALL';

export function AsciiTimePivot({
  value,
  build,
  options = ['24H', '7D', '30D', 'ALL'],
}: {
  value: AsciiWindow;
  build: (o: AsciiWindow) => string;
  options?: AsciiWindow[];
}) {
  return (
    <div className="inline-flex" style={{ border: '1px solid var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
      {options.map((o, i) => {
        const on = o === value;
        return (
          <Link
            key={o}
            href={build(o)}
            style={{
              padding: '4px 8px',
              background: on ? 'color-mix(in oklch, var(--accent) 13%, transparent)' : 'transparent',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
              borderRight: i === options.length - 1 ? 'none' : '1px solid var(--fg-3)',
              fontSize: 9.5,
              letterSpacing: '0.08em',
            }}
          >
            {o}
          </Link>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * AsciiCaveat — // commented footer lines, monospace.
 * ───────────────────────────────────────────────────────────── */

export function AsciiCaveat({ lines }: { lines: string[] }) {
  return (
    <div
      className="px-4 pt-5 pb-1"
      style={{
        color: 'var(--fg-4)',
        fontSize: 9.5,
        lineHeight: 1.7,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>// {l}</div>
      ))}
    </div>
  );
}
