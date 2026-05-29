'use client';

import { useEffect, useRef, useState } from 'react';
import { Lbl, Mono } from '../primitives';
import type { SoldBackPoint } from '@/lib/queries';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* iso is "YYYY-MM-DD" — parse as UTC so SSR + first-pass client render
 * produce the same string. After mount, `local` flips true and the date
 * displays in the user's clock. */
function fmtDay(iso: string, local: boolean): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const mo = local ? date.getMonth() : date.getUTCMonth();
  const da = local ? date.getDate() : date.getUTCDate();
  return `${MONTHS[mo]} ${da}`;
}

function fmtDayLong(iso: string, local: boolean): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const mo = local ? date.getMonth() : date.getUTCMonth();
  const da = local ? date.getDate() : date.getUTCDate();
  const w = local ? date.getDay() : date.getUTCDay();
  return `${WEEKDAYS[w]} · ${MONTHS[mo]} ${da}`;
}

export default function SoldBackChart({ data }: { data: SoldBackPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 130;
  const last = data[data.length - 1]?.rate ?? 0;
  const dx = data.length > 1 ? W / (data.length - 1) : W;

  const points = data.map((p, i) => [i * dx, H - p.rate * H] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${W},${H} L 0,${H} Z`;

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

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const cursorPct = hoverIdx !== null && data.length > 1 ? (hoverIdx / (data.length - 1)) * 100 : 0;
  // Flip tooltip leftward when cursor is past 65% so it doesn't clip the right edge.
  const tooltipOnLeft = cursorPct > 65;

  return (
    <div
      ref={containerRef}
      className="mx-3 relative"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="flex items-baseline px-3 pt-2.5">
        <Lbl>Sold-back rate · daily</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>
          {(last * 100).toFixed(1)}%
        </Mono>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 110, display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <defs>
          <linearGradient id="soldback-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map(y => (
          <line
            key={y}
            x1="0"
            y1={H - (y / 100) * H}
            x2={W}
            y2={H - (y / 100) * H}
            stroke="var(--line-soft)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={fillPath} fill="url(#soldback-fill)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
        {/* Marker on the most recent day only — per-day dots would clutter. */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r={3}
            fill="var(--accent)"
          />
        )}
        {/* Hover cursor: vertical line + dot at the hovered day's value. */}
        {hoverIdx !== null && (
          <>
            <line
              x1={points[hoverIdx][0]}
              y1={0}
              x2={points[hoverIdx][0]}
              y2={H}
              stroke="var(--accent)"
              strokeOpacity="0.4"
              strokeDasharray="2 3"
            />
            <circle
              cx={points[hoverIdx][0]}
              cy={points[hoverIdx][1]}
              r={3}
              fill="var(--accent)"
            />
          </>
        )}
      </svg>
      <div className="flex justify-between px-3 pb-2.5">
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>{fmtDay(data[0].bucket, mounted)}</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>{fmtDay(data[data.length - 1].bucket, mounted)}</Mono>
      </div>

      {/* Tooltip — only when hovering. */}
      {hovered && (
        <div
          className="pointer-events-none absolute"
          style={{
            top: 36,
            left: tooltipOnLeft ? 'auto' : `min(calc(${cursorPct}% + 14px), calc(100% - 132px))`,
            right: tooltipOnLeft ? `min(calc(${100 - cursorPct}% + 14px), calc(100% - 132px))` : 'auto',
            background: 'var(--bg-3)',
            border: '1px solid var(--line)',
            padding: '6px 9px',
            minWidth: 118,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            zIndex: 5,
          }}
        >
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em', display: 'block' }}>
            {fmtDayLong(hovered.bucket, mounted)}
          </Mono>
          <div className="mt-1 flex items-center justify-between gap-3">
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>SOLD</Mono>
            <Mono style={{ fontSize: 12, color: 'var(--accent)' }}>
              {(hovered.rate * 100).toFixed(1)}%
            </Mono>
          </div>
        </div>
      )}
    </div>
  );
}
