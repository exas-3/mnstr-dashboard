'use client';

/* Hand-rolled stacked-area chart for daily pulls by tier.
 * Ported from screens.jsx::VelocityChart, but the curves are computed from
 * real data rather than hand-tuned bezier paths.
 *
 * Hover anywhere over the chart to surface a tooltip with the day's per-
 * tier breakdown + total. A vertical cursor line tracks the nearest day. */

import { useEffect, useRef, useState } from 'react';
import { Lbl, Mono, tierLabel, type Tier } from './primitives';
import { abbrUsdStr } from '@/lib/format';

interface VelocityPoint {
  day: string;
  starter: number;
  great: number;
  premium: number;
  ultra: number;
  adventure: number;
  outlaw: number;
}

type VKey = 'starter' | 'great' | 'premium' | 'ultra' | 'adventure' | 'outlaw';

const TIERS: Array<{ key: VKey; label: Tier; color: string; gradientId: string }> = [
  { key: 'starter',   label: 'Starter',   color: 'var(--tier-blue)',    gradientId: 'velocity-starter' },
  { key: 'great',     label: 'Great',     color: 'var(--tier-green)',   gradientId: 'velocity-great' },
  { key: 'premium',   label: 'Premium',   color: 'var(--accent)',       gradientId: 'velocity-premium' },
  { key: 'ultra',     label: 'Ultra',     color: 'var(--tier-magenta)', gradientId: 'velocity-ultra'   },
  { key: 'adventure', label: 'Adventure', color: 'var(--tier-cyan)',    gradientId: 'velocity-adventure' },
  { key: 'outlaw',    label: 'Outlaw',    color: 'var(--tier-violet)',  gradientId: 'velocity-outlaw' },
];

// Pack USD price per tier — sourced from scripts/config.ts GACHA_CONTRACTS.
// Used to convert raw pull counts into dollar volume so low-count high-price
// tiers (Adventure $150, Ultra $1250) aren't visually flattened next to the
// high-count Starter ($50) stream.
const TIER_PRICE_USD: Record<VKey, number> = {
  starter:   50,
  great:     100,
  premium:   250,
  ultra:     1250,
  adventure: 150,
  outlaw:    500,
};

/* Bucket label formatter. SQL emits buckets in UTC ("YYYY-MM-DD" daily or
 * "YYYY-MM-DD HH:00" hourly), so we parse as UTC first, then format in the
 * user's local clock once `local` flips true (post-hydration via the
 * useLocalFormatter hook). SSR + first client render use UTC so HTML matches
 * byte-for-byte; the swap to local happens on mount. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function fmtBucket(iso: string, granularity: 'day' | 'hour', local: boolean): string {
  if (granularity === 'hour') {
    // "2026-05-26 14:00" — parse as UTC, then read local fields when mounted.
    const [datePart, timePart] = iso.split(' ');
    const [y, mo, d] = datePart.split('-').map(Number);
    const [hh] = timePart.split(':').map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d, hh));
    const m = local ? date.getMonth()  : date.getUTCMonth();
    const da = local ? date.getDate()  : date.getUTCDate();
    const h = local ? date.getHours()  : date.getUTCHours();
    return `${MONTHS[m]} ${da} · ${pad(h)}:00`;
  }
  // "2026-05-26"
  const [y, mo, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const m = local ? date.getMonth() : date.getUTCMonth();
  const da = local ? date.getDate() : date.getUTCDate();
  const w = local ? date.getDay()   : date.getUTCDay();
  return `${WEEKDAYS[w]} · ${MONTHS[m]} ${da}`;
}

export default function VelocityChart({
  data,
  span = 30,
  granularity = 'day',
}: {
  data: VelocityPoint[];
  span?: number;
  granularity?: 'day' | 'hour';
}) {
  const unit = granularity === 'hour' ? 'h' : 'd';
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // Mounted flag — SSR + first client render use UTC so HTML matches; post-
  // mount we re-render with the user's local clock.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="px-3 pt-2.5 pb-1.5">
          <Lbl>Volume · {span}{unit} · USD</Lbl>
        </div>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 120;

  // Compute cumulative stacked y per day in USD volume (pulls × tier price)
  // so the visible band height reflects each tier's actual revenue weight,
  // not raw pull count. Peak is the highest total stack across the window.
  // Cumulative stack order: starter → great → premium → ultra → adventure → outlaw.
  type Stack = { s: number; g: number; p: number; u: number; a: number; o: number };
  const stacked: Stack[] = data.map(d => {
    const sV = d.starter   * TIER_PRICE_USD.starter;
    const gV = d.great     * TIER_PRICE_USD.great;
    const pV = d.premium   * TIER_PRICE_USD.premium;
    const uV = d.ultra     * TIER_PRICE_USD.ultra;
    const aV = d.adventure * TIER_PRICE_USD.adventure;
    const oV = d.outlaw    * TIER_PRICE_USD.outlaw;
    const s = sV;
    const g = s + gV;
    const p = g + pV;
    const u = p + uV;
    const a = u + aV;
    const o = a + oV;
    return { s, g, p, u, a, o };
  });
  const peak = Math.max(1, ...stacked.map(s => s.o));
  const dx = data.length > 1 ? W / (data.length - 1) : W;

  function pathFor(top: (s: Stack) => number, bottom: (s: Stack) => number) {
    // Top edge L→R, bottom edge R→L
    const topPts = stacked.map((s, i) => [i * dx, H - (top(s) / peak) * H] as const);
    const botPts = stacked.map((s, i) => [i * dx, H - (bottom(s) / peak) * H] as const).reverse();
    const top0 = `M${topPts[0][0].toFixed(1)},${topPts[0][1].toFixed(1)}`;
    const topL = topPts.slice(1).map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const botL = botPts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return `${top0} ${topL} ${botL} Z`;
  }

  function lineFor(top: (s: Stack) => number) {
    return stacked
      .map((s, i) => {
        const x = i * dx;
        const y = H - (top(s) / peak) * H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const starterArea   = pathFor(s => s.s, () => 0);
  const greatArea     = pathFor(s => s.g, s => s.s);
  const premiumArea   = pathFor(s => s.p, s => s.g);
  const ultraArea     = pathFor(s => s.u, s => s.p);
  const adventureArea = pathFor(s => s.a, s => s.u);
  const outlawArea    = pathFor(s => s.o, s => s.a);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const t = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(t * (data.length - 1))));
    setHoverIdx(idx);
  }
  function onMouseLeave() {
    setHoverIdx(null);
  }

  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  // Tooltip values mirror the rendered bands: dollar volume, not raw pulls.
  const hoveredVolumes = hovered
    ? {
        starter:   hovered.starter   * TIER_PRICE_USD.starter,
        great:     hovered.great     * TIER_PRICE_USD.great,
        premium:   hovered.premium   * TIER_PRICE_USD.premium,
        ultra:     hovered.ultra     * TIER_PRICE_USD.ultra,
        adventure: hovered.adventure * TIER_PRICE_USD.adventure,
        outlaw:    hovered.outlaw    * TIER_PRICE_USD.outlaw,
      }
    : null;
  const hoveredTotal = hoveredVolumes
    ? hoveredVolumes.starter + hoveredVolumes.great + hoveredVolumes.premium
        + hoveredVolumes.ultra + hoveredVolumes.adventure + hoveredVolumes.outlaw
    : 0;
  // Tooltip percent-left within the chart, flipped to the left side when the
  // cursor is past 65% so it doesn't clip the right edge.
  const cursorPct = hoverIdx != null && data.length > 1 ? (hoverIdx / (data.length - 1)) * 100 : 0;
  const tooltipOnLeft = cursorPct > 65;

  return (
    <div
      ref={containerRef}
      className="mx-3 relative"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="flex items-baseline px-3 pt-2.5 pb-1.5">
        <Lbl>Velocity · {span}{unit}</Lbl>
        <div className="ml-auto flex gap-3">
          {TIERS.map(t => (
            <Mono key={t.key} style={{ fontSize: 8.5, color: t.color }}>
              ● {tierLabel(t.label)}
            </Mono>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 110, display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <defs>
          <linearGradient id="velocity-starter" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.5" />
            <stop offset="1" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="velocity-great" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.80 0.15 150)" stopOpacity="0.5" />
            <stop offset="1" stopColor="oklch(0.80 0.15 150)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="velocity-premium" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="velocity-ultra" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="velocity-adventure" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.78 0.14 200)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.78 0.14 200)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="velocity-outlaw" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.70 0.16 295)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.70 0.16 295)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <g stroke="var(--line-soft)" strokeDasharray="2 4">
          <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} />
          <line x1="0" y1={H * 0.5}  x2={W} y2={H * 0.5}  />
          <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} />
        </g>
        <path d={starterArea}   fill="url(#velocity-starter)"   />
        <path d={greatArea}     fill="url(#velocity-great)"     />
        <path d={premiumArea}   fill="url(#velocity-premium)"   />
        <path d={ultraArea}     fill="url(#velocity-ultra)"     />
        <path d={adventureArea} fill="url(#velocity-adventure)" />
        <path d={outlawArea}    fill="url(#velocity-outlaw)"    />
        <path d={lineFor(s => s.s)} fill="none" stroke="oklch(0.72 0.14 240)" strokeWidth="1" />
        <path d={lineFor(s => s.g)} fill="none" stroke="var(--tier-green)" strokeWidth="1" />
        <path d={lineFor(s => s.p)} fill="none" stroke="var(--accent)" strokeWidth="1.2" />
        <path d={lineFor(s => s.u)} fill="none" stroke="var(--tier-magenta)" strokeWidth="1" />
        <path d={lineFor(s => s.a)} fill="none" stroke="var(--tier-cyan)" strokeWidth="1" />
        <path d={lineFor(s => s.o)} fill="none" stroke="var(--tier-violet)" strokeWidth="1" />
        {/* Hover cursor: vertical line + dot at the top of the stack */}
        {hoverIdx != null && (
          <g pointerEvents="none">
            <line
              x1={hoverIdx * dx}
              y1={0}
              x2={hoverIdx * dx}
              y2={H}
              stroke="var(--fg-3)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoverIdx * dx}
              cy={H - (stacked[hoverIdx].o / peak) * H}
              r="2.5"
              fill="var(--fg)"
              stroke="var(--bg-2)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
      <div className="flex justify-between px-3 pt-1 pb-2.5">
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>
          {fmtBucket(data[0].day, granularity, mounted)}
        </Mono>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>now</Mono>
      </div>

      {/* Tooltip — only when hovering */}
      {hovered && (
        <div
          className="pointer-events-none absolute"
          style={{
            top: 36,
            left: tooltipOnLeft ? 'auto' : `min(calc(${cursorPct}% + 14px), calc(100% - 156px))`,
            right: tooltipOnLeft ? `min(calc(${100 - cursorPct}% + 14px), calc(100% - 156px))` : 'auto',
            background: 'var(--bg-3)',
            border: '1px solid var(--line)',
            padding: '6px 9px',
            minWidth: 140,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            zIndex: 5,
          }}
        >
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em', display: 'block' }}>
            {fmtBucket(hovered.day, granularity, mounted)}
          </Mono>
          <div className="mt-1.5 grid gap-0.5">
            {TIERS.map(t => {
              const pulls = hovered[t.key];
              const vol = hoveredVolumes ? hoveredVolumes[t.key] : 0;
              return (
                <div key={t.key} className="flex items-center justify-between gap-3">
                  <Mono style={{ fontSize: 9.5, color: t.color }}>● {tierLabel(t.label)}</Mono>
                  <Mono style={{ fontSize: 9.5, color: vol > 0 ? 'var(--fg)' : 'var(--fg-4)' }}>
                    {abbrUsdStr(vol)}
                    <span style={{ color: 'var(--fg-4)', marginLeft: 4 }}>· {pulls.toLocaleString('en-US')}</span>
                  </Mono>
                </div>
              );
            })}
          </div>
          <div
            className="mt-1 pt-1 flex items-center justify-between"
            style={{ borderTop: '1px dashed var(--line-soft)' }}
          >
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>VOLUME</Mono>
            <Mono style={{ fontSize: 10, color: 'var(--accent)' }}>
              {abbrUsdStr(hoveredTotal)}
            </Mono>
          </div>
        </div>
      )}
    </div>
  );
}
