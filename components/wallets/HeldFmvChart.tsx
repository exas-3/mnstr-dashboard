'use client';

/* Held-inventory FMV over time for one wallet (localhost-only, dev-gated by the
 * page). A single area: Σ FMV of cards currently in the vault, on a time axis
 * starting at the first pull. It rises on pulls + marketplace buys, falls on
 * sell-backs, and re-prices with the hourly FMV snapshots. Y starts at 0; the
 * line ends at "now" if cards are still held, else at the last sell. A brush
 * strip zooms/pans the time window (like the portfolio line chart).
 * Series built by getWalletHeldFmvSeries. Mounted-gated (Recharts needs DOM). */

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Mono } from '../primitives';
import type { HeldFmvPoint } from '@/lib/queries/held-fmv';
import { abbrUsd, fmtAxis, fmtDateTime } from './pnl-chart/format';

const HEIGHT = 248; // includes the brush strip
const COLOR = 'var(--positive)'; // mint = the app's "holding" colour

function HeldTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HeldFmvPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', padding: '6px 9px', fontFamily: 'var(--font-mono)' }}>
      <div style={{ fontSize: 13, color: COLOR }}>${Math.round(p.held).toLocaleString('en-US')}</div>
      <div style={{ fontSize: 8.5, color: 'var(--fg-3)', marginTop: 2 }}>{p.n.toLocaleString('en-US')} card{p.n === 1 ? '' : 's'} held</div>
      <div style={{ fontSize: 8.5, color: 'var(--fg-4)', marginTop: 2 }}>{fmtDateTime(p.ts)}</div>
    </div>
  );
}

export default function HeldFmvChart({ points, current }: { points: HeldFmvPoint[]; current: number }) {
  const [mounted, setMounted] = useState(false);
  // Brush (zoom/pan) window as data indices — drag the handles to zoom, drag the
  // window to pan, like the portfolio line chart.
  const [win, setWin] = useState<{ startIndex?: number; endIndex?: number }>({});
  useEffect(() => setMounted(true), []);
  useEffect(() => setWin({}), [points]); // reset zoom when the data changes

  // ~6 evenly-spaced time ticks across the VISIBLE (brushed) window — keeps the
  // axis readable while zoomed and avoids Recharts crowding dense series.
  const last = points.length - 1;
  const clamp = (n: number) => Math.max(0, Math.min(n, last));
  const tLo = points.length ? points[clamp(win.startIndex ?? 0)].ts : 0;
  const tHi = points.length ? points[clamp(win.endIndex ?? last)].ts : 0;
  const ticks = points.length >= 2 && tHi > tLo
    ? Array.from({ length: 6 }, (_, k) => Math.round(tLo + (tHi - tLo) * k / 5))
    : undefined;

  return (
    <div className="mx-3 mt-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline gap-2 px-3.5 pt-3">
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>HELD INVENTORY · FMV</Mono>
        <Mono style={{ fontSize: 13, color: COLOR }}>${Math.round(current).toLocaleString('en-US')}</Mono>
      </div>

      <div style={{ height: HEIGHT, padding: '8px 6px 4px' }}>
        {!mounted || points.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>{points.length === 0 ? 'no held cards' : '…'}</Mono>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="held-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={COLOR} stopOpacity={0.34} />
                  <stop offset={1} stopColor={COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line-soft)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                ticks={ticks}
                interval={0}
                tickFormatter={(v: number) => fmtAxis(v)}
                tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
                stroke="var(--line-soft)"
                minTickGap={44}
              />
              <YAxis
                domain={[0, 'dataMax']}
                tickFormatter={(v: number) => abbrUsd(v)}
                tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
                stroke="var(--line-soft)"
                width={46}
              />
              <Tooltip content={<HeldTooltip />} cursor={{ stroke: 'var(--fg-4)', strokeDasharray: '3 3' }} />
              <Area
                type="stepAfter"
                dataKey="held"
                stroke={COLOR}
                strokeWidth={1.5}
                fill="url(#held-fill)"
                dot={false}
                activeDot={{ r: 3, fill: COLOR, stroke: 'var(--bg)' }}
                isAnimationActive={false}
              />
              <Brush
                dataKey="ts"
                height={18}
                travellerWidth={8}
                stroke="var(--line-soft)"
                fill="var(--bg-3)"
                tickFormatter={(v: number) => fmtAxis(v)}
                onChange={(r: { startIndex?: number; endIndex?: number }) => setWin({ startIndex: r.startIndex, endIndex: r.endIndex })}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-3.5 pb-3" style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', display: 'block', lineHeight: 1.6 }}>
          Σ FMV of cards in vault (held ≥1h) · rises on pulls &amp; marketplace buys, falls on
          sell-backs · re-prices from every pull&apos;s FMV + the hourly poll (since 2026-05-28).
        </Mono>
      </div>
    </div>
  );
}
