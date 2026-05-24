/* Foundational primitives, ported from design/screens.jsx + app-features.jsx.
 *
 * Why not styled-components / module CSS? The prototype uses inline styles
 * with a single `P` palette object. To stay 1:1 visually while using Tailwind,
 * each primitive uses Tailwind utility classes where they map cleanly to
 * common rules and inline `style` for the dense per-instance tweaks
 * (letter-spacing, exact pixel sizes, gradients) that the design relies on. */

import type { CSSProperties, ReactNode } from 'react';

export type Tier = 'Starter' | 'Premium' | 'Ultra' | 'Adventure';
export type Status = 'holding' | 'sold_back' | 'redeemed';

/* MnStr labels the Premium tier as "Monster" in their UI. We keep "Premium"
 * as the canonical name in DB + chain + URL params, and use this helper
 * everywhere it surfaces in user-visible text. Adventure is the One Piece
 * pack — different IP, same label as the API. */
export function tierLabel(tier: string): string {
  return tier === 'Premium' ? 'Monster' : tier;
}

/* ─────────────────────────────────────────────────────────────
 * Text primitives
 * ───────────────────────────────────────────────────────────── */

export function Mono({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {children}
    </span>
  );
}

export function Lbl({
  children,
  color = 'var(--fg-3)',
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHead({
  tag,
  title,
  right,
}: {
  tag: string;
  title: string;
  right?: ReactNode;
}) {
  // Strip the prototype's "NN · " numbered prefix — the visual hierarchy was
  // designed around dense mobile screens; the production app drops it.
  const cleanTag = tag.replace(/^\d+\s*·\s*/, '');
  return (
    <div className="flex items-baseline gap-2 px-4 pt-5 pb-2.5">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          color: 'var(--accent)',
          letterSpacing: '0.18em',
        }}
      >
        {cleanTag}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
      {right && (
        <span
          className="ml-auto"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--fg-4)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Tags / pills
 * ───────────────────────────────────────────────────────────── */

const TIER_META: Record<Tier, { color: string; letter: string }> = {
  Starter:   { color: 'var(--tier-blue)',    letter: 'S' },
  Premium:   { color: 'var(--accent)',       letter: 'M' },
  Ultra:     { color: 'var(--tier-magenta)', letter: 'U' },
  Adventure: { color: 'var(--tier-cyan)',    letter: 'A' },
};

export function TierTag({ tier, style }: { tier: Tier; style?: CSSProperties }) {
  const m = TIER_META[tier];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 6px',
        border: `1px solid color-mix(in oklch, ${m.color} 33%, transparent)`,
        background: `color-mix(in oklch, ${m.color} 7%, transparent)`,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: m.color,
        ...style,
      }}
    >
      <span style={{ width: 5, height: 5, background: m.color }} />
      {tierLabel(tier)}
    </span>
  );
}

const STATUS_META: Record<Status, { color: string; text: string }> = {
  holding:   { color: 'var(--positive)',     text: 'HOLDING' },
  sold_back: { color: 'var(--tier-magenta)', text: 'SOLD' },
  redeemed:  { color: 'var(--tier-blue)',    text: 'REDEEMED' },
};

export function StatusPill({ status }: { status: Status | string }) {
  const m = (STATUS_META as Record<string, { color: string; text: string }>)[status] ?? {
    color: 'var(--fg-3)',
    text: status?.toUpperCase() || '—',
  };
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        padding: '2px 6px',
        border: `1px solid color-mix(in oklch, ${m.color} 33%, transparent)`,
        color: m.color,
        background: `color-mix(in oklch, ${m.color} 6%, transparent)`,
      }}
    >
      {m.text}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CardSlot — 5:7 placeholder when no image; renders <img> when src given.
 * ───────────────────────────────────────────────────────────── */

export function CardSlot({
  fmv,
  psa = 'PSA 10',
  hot,
  chase,
  label,
  imageUrl,
  captionTier,
}: {
  fmv?: string | number;
  psa?: string;
  hot?: boolean;
  chase?: boolean;
  label?: string;
  imageUrl?: string | null;
  captionTier?: Tier;
}) {
  return (
    <div
      className="relative flex w-full flex-col justify-between"
      style={{
        aspectRatio: '5/7',
        background: imageUrl
          ? `center/contain no-repeat url("${imageUrl}"), var(--bg-3)`
          : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)',
        border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
        boxShadow: hot
          ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 0 22px color-mix(in oklch, var(--accent) 12%, transparent)'
          : 'none',
        padding: 7,
      }}
    >
      <div className="flex items-start justify-between">
        <Mono style={{ fontSize: 8.5, color: 'var(--accent)', letterSpacing: '0.1em' }}>{psa}</Mono>
        {chase && (
          <Mono style={{ fontSize: 8.5, color: 'var(--tier-magenta)', letterSpacing: '0.12em' }}>
            CHASE
          </Mono>
        )}
      </div>
      <div>
        {label && (
          <div
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-3)',
              marginBottom: 2,
            }}
          >
            {label}
          </div>
        )}
        <div className="flex items-baseline justify-between">
          {fmv !== undefined && (
            <Mono style={{ fontSize: 13, color: 'var(--fg)' }}>${fmv}</Mono>
          )}
          {captionTier && <TierTag tier={captionTier} style={{ padding: '1px 4px', fontSize: 7.5 }} />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Sparkline
 * ───────────────────────────────────────────────────────────── */

export function Sparkline({
  pts,
  color = 'var(--positive)',
  w = 60,
  h = 18,
}: {
  pts: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (!pts || pts.length === 0) return null;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const dx = w / Math.max(1, pts.length - 1);
  const d = pts
    .map((v, i) => {
      const x = i * dx;
      const y = h - ((v - min) / Math.max(1e-9, max - min)) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
 * KpiTile
 * ───────────────────────────────────────────────────────────── */

export function KpiTile({
  label,
  value,
  unit,
  delta,
  deltaDown,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaDown?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line-soft)',
        padding: '10px 12px',
        minHeight: 72,
      }}
    >
      <Lbl style={{ fontSize: 8.5, letterSpacing: '0.14em' }}>{label}</Lbl>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {unit && <span style={{ color: 'var(--fg-3)', fontSize: 12, marginLeft: 2 }}>{unit}</span>}
      </div>
      {delta && (
        <Mono style={{ fontSize: 9.5, color: deltaDown ? 'var(--tier-magenta)' : 'var(--positive)' }}>
          {deltaDown ? '↓' : '↑'} {delta}
        </Mono>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Identicon — deterministic 5×3 mirrored grid
 * ───────────────────────────────────────────────────────────── */

const IDENT_PALETTE = [
  'var(--accent)',
  'var(--tier-magenta)',
  'var(--positive)',
  'var(--tier-blue)',
  'oklch(0.78 0.16 35)',
  'oklch(0.78 0.14 195)',
];

export function Identicon({ addr = '0x000000', size = 28 }: { addr?: string; size?: number }) {
  const seed = (addr || '').replace(/^0x/, '').padEnd(40, '0').toLowerCase();
  const colA = IDENT_PALETTE[parseInt(seed.charAt(0) || '0', 16) % IDENT_PALETTE.length];
  const colB = IDENT_PALETTE[parseInt(seed.charAt(2) || '0', 16) % IDENT_PALETTE.length];
  const px = size / 5;
  const cells: Array<{ r: number; c: number; alt: boolean }> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = (r * 3 + c) % seed.length;
      const bit = parseInt(seed[idx] || '0', 16) & 1;
      const fillIdx = (r * 3 + c + 7) % seed.length;
      const filled = parseInt(seed[fillIdx] || '0', 16) > 7;
      if (filled) cells.push({ r, c, alt: bit === 1 });
    }
  }
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: 'var(--bg-3)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {cells.flatMap(cell => [
        <div
          key={`${cell.r}-${cell.c}-L`}
          style={{
            position: 'absolute',
            top: cell.r * px,
            left: cell.c * px,
            width: px,
            height: px,
            background: cell.alt ? colA : colB,
          }}
        />,
        <div
          key={`${cell.r}-${cell.c}-R`}
          style={{
            position: 'absolute',
            top: cell.r * px,
            left: (4 - cell.c) * px,
            width: px,
            height: px,
            background: cell.alt ? colA : colB,
          }}
        />,
      ])}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TimePivot — 24H / 7D / 30D / ALL
 * ───────────────────────────────────────────────────────────── */

export type TimeWindow = '24H' | '7D' | '30D' | 'ALL';

export function TimePivot({
  value,
  onChange,
  options = ['24H', '7D', '30D', 'ALL'],
}: {
  value: TimeWindow;
  onChange: (v: TimeWindow) => void;
  options?: TimeWindow[];
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--line-soft)',
        background: 'var(--bg-2)',
      }}
    >
      {options.map((o, i) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '5px 10px',
              background: on ? 'var(--bg-3)' : 'transparent',
              borderRight: i === options.length - 1 ? 'none' : '1px solid var(--line-soft)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.1em',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
