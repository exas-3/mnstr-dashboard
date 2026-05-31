'use client';

/* One card's MnStr FMV over time, on a time axis. Built by getCardFmvHistory
 * from every pull's frozen FMV plus the hourly snapshots, ending at the live
 * FMV (the page's MnStr FMV). Y auto-scales (it's a price, not a total) so the
 * movement is visible. Mounted-gated (Recharts needs DOM). */

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Mono } from '../primitives';
import type { CardFmvPoint } from '@/lib/queries';
import { abbrUsd, fmtAxis, fmtDateTime } from '../wallets/pnl-chart/format';

const HEIGHT = 200;
const COLOR = 'var(--accent)'; // amber = the app's FMV colour

function FmvTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CardFmvPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', padding: '6px 9px', fontFamily: 'var(--font-mono)' }}>
      <div style={{ fontSize: 13, color: COLOR }}>${p.fmv.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
      <div style={{ fontSize: 8.5, color: 'var(--fg-4)', marginTop: 2 }}>{fmtDateTime(p.ts)}</div>
    </div>
  );
}

export default function CardFmvChart({ points, current }: { points: CardFmvPoint[]; current: number | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ~6 evenly-spaced time ticks (else Recharts crowds the axis).
  const ticks = points.length >= 2
    ? Array.from({ length: 6 }, (_, k) => Math.round(points[0].ts + (points[points.length - 1].ts - points[0].ts) * k / 5))
    : undefined;

  return (
    <div className="mx-3 mt-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline gap-2 px-3.5 pt-3">
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>MNSTR FMV · HISTORY</Mono>
        {current !== null && (
          <Mono style={{ fontSize: 13, color: COLOR }}>${current.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Mono>
        )}
      </div>

      <div style={{ height: HEIGHT, padding: '8px 6px 4px' }}>
        {!mounted || points.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>{points.length === 0 ? 'no FMV history' : '…'}</Mono>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cardfmv-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={COLOR} stopOpacity={0.3} />
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
                domain={[(min: number) => Math.max(0, Math.floor(min * 0.92)), (max: number) => Math.ceil(max * 1.08)]}
                tickFormatter={(v: number) => abbrUsd(v)}
                tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
                stroke="var(--line-soft)"
                width={46}
              />
              <Tooltip content={<FmvTooltip />} cursor={{ stroke: 'var(--fg-4)', strokeDasharray: '3 3' }} />
              <Area
                type="stepAfter"
                dataKey="fmv"
                stroke={COLOR}
                strokeWidth={1.5}
                fill="url(#cardfmv-fill)"
                dot={false}
                activeDot={{ r: 3, fill: COLOR, stroke: 'var(--bg)' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-3.5 pb-3" style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', display: 'block', lineHeight: 1.6 }}>
          MnStr FMV over time · from every pull&apos;s appraisal + the hourly poll (since 2026-05-28).
        </Mono>
      </div>
    </div>
  );
}
