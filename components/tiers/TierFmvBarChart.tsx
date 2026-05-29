'use client';

/* Responsive log10-binned bar chart of the FMV distribution.
 *
 * The server query returns ~200 high-resolution log10 bins per tier; this
 * component measures its rendered width via ResizeObserver and aggregates
 * those down to a target client bin count that scales with the available
 * width (≈1 bar per TARGET_BAR_PX pixels). The viewBox is expressed in CSS
 * pixels so the chart fills the container edge-to-edge with no letterboxing.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lbl, Mono } from '../primitives';
import type { FmvBin, FmvDistribution } from '@/lib/queries';

const HEIGHT = 160;
const PAD_X = 16;
const PAD_TOP = 12;
const PAD_BOT = 24;
const BASELINE = HEIGHT - PAD_BOT;
const PLOT_H = BASELINE - PAD_TOP;
const TARGET_BAR_PX = 6;     // ≈ how many px wide each bar should be
const MIN_BINS = 16;
const MAX_BINS = 80;
const SSR_WIDTH = 720;       // fallback for first render

function makeXForLog10(logMin: number, logMax: number, width: number): (v: number) => number {
  const range = logMax - logMin || 1;
  return (v: number) => PAD_X + ((v - logMin) / range) * (width - 2 * PAD_X);
}

function makeTicks(logMin: number, logMax: number): number[] {
  const NICE = [1, 2, 5];
  const lo = Math.floor(logMin);
  const hi = Math.ceil(logMax);
  const out: number[] = [];
  for (let decade = lo; decade <= hi; decade++) {
    for (const m of NICE) {
      const v = m * Math.pow(10, decade);
      const l = Math.log10(v);
      if (l >= logMin && l <= logMax) out.push(v);
    }
  }
  if (out.length < 3) {
    const lowFmv = Math.pow(10, logMin);
    const highFmv = Math.pow(10, logMax);
    if (!out.includes(lowFmv))  out.unshift(lowFmv);
    if (!out.includes(highFmv)) out.push(highFmv);
  }
  return out;
}

function fmtTickLabel(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  if (n >= 1)         return `$${Math.round(n).toLocaleString('en-US')}`;
  return `$${n.toFixed(2)}`;
}

function fmtFmv(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(n >= 10_000 ? 1 : 2)}k`;
  if (n >= 10)        return `$${Math.round(n).toLocaleString('en-US')}`;
  return `$${n.toFixed(2)}`;
}

/* Aggregate the high-res server bins into `target` client bins, then trim
 * any leading + trailing all-zero bins so the chart starts at the first bin
 * with pulls and ends at the last. Bin width (in log10 space) is preserved
 * across the trim — only the displayed range changes. */
function buildBins(
  serverBins: FmvBin[],
  serverLogMin: number,
  serverLogMax: number,
  target: number,
): { bins: FmvBin[]; logMin: number; logMax: number; step: number } {
  const N = Math.min(target, serverBins.length);
  const step = (serverLogMax - serverLogMin) / N;
  const aggregated: FmvBin[] = [];
  for (let i = 0; i < N; i++) {
    aggregated.push({ log10Mid: serverLogMin + (i + 0.5) * step, count: 0 });
  }
  if (N === serverBins.length) {
    for (let i = 0; i < N; i++) aggregated[i].count = serverBins[i].count;
  } else {
    for (const b of serverBins) {
      const t = (b.log10Mid - serverLogMin) / (serverLogMax - serverLogMin);
      const idx = Math.min(N - 1, Math.max(0, Math.floor(t * N)));
      aggregated[idx].count += b.count;
    }
  }
  // Trim leading/trailing zeros. Gaps in the middle are kept.
  let first = 0;
  while (first < aggregated.length && aggregated[first].count === 0) first++;
  let last = aggregated.length - 1;
  while (last >= 0 && aggregated[last].count === 0) last--;
  if (first > last) {
    return { bins: aggregated, logMin: serverLogMin, logMax: serverLogMax, step };
  }
  return {
    bins: aggregated.slice(first, last + 1),
    logMin: serverLogMin + first * step,
    logMax: serverLogMin + (last + 1) * step,
    step,
  };
}

export default function TierFmvBarChart({
  data,
  basis = 'fmv',
}: {
  data: FmvDistribution;
  basis?: 'fmv' | 'buyback';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(SSR_WIDTH);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Track the container's rendered width — bin count + bar geometry both
  // scale with it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(Math.max(200, el.getBoundingClientRect().width));
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setWidth(Math.max(200, e.contentRect.width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Number of client bins is derived from rendered width — narrow screen
  // gets fewer fatter bars, wide screen gets more thinner bars.
  const targetBins = useMemo(() => {
    const plot = Math.max(1, width - 2 * PAD_X);
    const raw = Math.round(plot / TARGET_BAR_PX);
    return Math.min(MAX_BINS, Math.max(MIN_BINS, Math.min(raw, data.bins.length)));
  }, [width, data.bins.length]);

  const { bins, logMin, logMax, step: binStep } = useMemo(
    () => buildBins(data.bins, data.logMin, data.logMax, targetBins),
    [data, targetBins],
  );

  if (data.n === 0 || bins.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="flex items-baseline px-3 pt-2.5 pb-1">
          <Lbl>{basis === 'buyback' ? 'Buyback' : 'FMV'} distribution · log $</Lbl>
        </div>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  // viewBox is in CSS pixels matching the rendered size — no letterboxing,
  // cursor math is direct.
  const W = width;
  const H = HEIGHT;
  const xForLog10 = makeXForLog10(logMin, logMax, W);
  const ticks = makeTicks(logMin, logMax);
  const peakCount = Math.max(...bins.map(b => b.count), 1);

  const barW = (W - 2 * PAD_X) / bins.length;

  // Markers only render when they fall inside the trimmed [logMin, logMax]
  // range — otherwise they'd overflow the chart area.
  const inRange = (logVal: number) => logVal >= logMin && logVal <= logMax;
  const medianX =
    data.median !== null && data.median > 0 && inRange(Math.log10(data.median))
      ? xForLog10(Math.log10(data.median))
      : null;
  const meanX =
    data.mean !== null && data.mean > 0 && inRange(Math.log10(data.mean))
      ? xForLog10(Math.log10(data.mean))
      : null;
  const priceX = data.price > 0 && inRange(Math.log10(data.price))
    ? xForLog10(Math.log10(data.price))
    : null;

  const labelsCollide =
    medianX !== null && meanX !== null && Math.abs(meanX - medianX) < 80;

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    // viewBox === rendered size, so CSS pixels map 1:1 to chart coords.
    const xInSvg = e.clientX - rect.left;
    const xInChart = xInSvg - PAD_X;
    const binPx = (rect.width - 2 * PAD_X) / bins.length;
    const idx = Math.max(0, Math.min(bins.length - 1, Math.floor(xInChart / binPx)));
    setHoverIdx(idx);
  }

  const hoveredBin = hoverIdx !== null ? bins[hoverIdx] : null;
  const hoveredX = hoveredBin ? xForLog10(hoveredBin.log10Mid) : 0;
  const cursorPct = (hoveredX / W) * 100;
  const tooltipOnLeft = cursorPct > 65;

  return (
    <div
      ref={containerRef}
      className="mx-3 relative"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="flex items-baseline px-3 pt-2.5">
        <Lbl>{basis === 'buyback' ? 'Buyback' : 'FMV'} distribution · log $</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-4)' }}>
          n = {data.n.toLocaleString('en-US')}
        </Mono>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="bar-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {priceX !== null && (
          <>
            <line
              x1={priceX}
              y1={PAD_TOP - 2}
              x2={priceX}
              y2={BASELINE + 4}
              stroke="var(--tier-magenta)"
              strokeDasharray="3 3"
            />
            <text
              x={priceX + 4}
              y={PAD_TOP + 8}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--tier-magenta)"
            >
              Booster price · ${data.price.toLocaleString('en-US')}
            </text>
          </>
        )}

        {bins.map((b, i) => {
          if (b.count === 0) return null;
          const h = (b.count / peakCount) * PLOT_H;
          const x = xForLog10(b.log10Mid) - barW / 2;
          const y = BASELINE - h;
          const isHovered = i === hoverIdx;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill="url(#bar-fill)"
              stroke={isHovered ? 'var(--accent)' : 'none'}
              strokeWidth={isHovered ? 1.2 : 0}
              opacity={hoverIdx === null || isHovered ? 1 : 0.7}
            />
          );
        })}

        <line
          x1={PAD_X}
          y1={BASELINE}
          x2={W - PAD_X}
          y2={BASELINE}
          stroke="var(--line)"
          strokeWidth="0.6"
        />

        {medianX !== null && (
          <>
            <line
              x1={medianX}
              y1={PAD_TOP}
              x2={medianX}
              y2={BASELINE}
              stroke="var(--fg)"
              strokeWidth="1.2"
            />
            <text
              x={labelsCollide ? medianX - 4 : medianX + 4}
              y={BASELINE + 12}
              textAnchor={labelsCollide ? 'end' : 'start'}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--fg-2)"
            >
              median · ${data.median!.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </text>
          </>
        )}

        {meanX !== null && (
          <>
            <line
              x1={meanX}
              y1={PAD_TOP}
              x2={meanX}
              y2={BASELINE}
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
            <text
              x={meanX + 4}
              y={BASELINE + 12}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--accent)"
            >
              mean · ${data.mean!.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </text>
          </>
        )}

        <g fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">
          {ticks.map((t, i) => {
            const x = xForLog10(Math.log10(t));
            const label = fmtTickLabel(t);
            const anchor: 'start' | 'middle' | 'end' =
              i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle';
            return (
              <text key={`${t}-${i}`} x={x} y={H - 6} textAnchor={anchor}>
                {label}
              </text>
            );
          })}
        </g>

        {hoverIdx !== null && hoveredBin && (
          <line
            x1={xForLog10(hoveredBin.log10Mid)}
            y1={PAD_TOP}
            x2={xForLog10(hoveredBin.log10Mid)}
            y2={BASELINE}
            stroke="var(--accent)"
            strokeOpacity="0.4"
            strokeDasharray="2 3"
          />
        )}
      </svg>

      {hoveredBin && (() => {
        const logLo = logMin + hoverIdx! * binStep;
        const logHi = logMin + (hoverIdx! + 1) * binStep;
        const fmvLo = Math.pow(10, logLo);
        const fmvHi = Math.pow(10, logHi);
        const pct = data.n > 0 ? (hoveredBin.count / data.n) * 100 : 0;
        return (
          <div
            className="pointer-events-none absolute"
            style={{
              top: 36,
              left: tooltipOnLeft ? 'auto' : `min(calc(${cursorPct}% + 14px), calc(100% - 152px))`,
              right: tooltipOnLeft ? `min(calc(${100 - cursorPct}% + 14px), calc(100% - 152px))` : 'auto',
              background: 'var(--bg-3)',
              border: '1px solid var(--line)',
              padding: '6px 9px',
              minWidth: 138,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              zIndex: 5,
            }}
          >
            <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em', display: 'block' }}>
              {fmtFmv(fmvLo)} – {fmtFmv(fmvHi)}
            </Mono>
            <div className="mt-1 flex items-center justify-between gap-3">
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>PULLS</Mono>
              <Mono style={{ fontSize: 12, color: 'var(--fg)' }}>
                {hoveredBin.count.toLocaleString('en-US')}
              </Mono>
            </div>
            <div
              className="mt-1 pt-1 flex items-center justify-between"
              style={{ borderTop: '1px dashed var(--line-soft)' }}
            >
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>SHARE</Mono>
              <Mono style={{ fontSize: 10, color: 'var(--accent)' }}>
                {pct.toFixed(pct >= 10 ? 1 : 2)}%
              </Mono>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
