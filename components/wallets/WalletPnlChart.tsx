'use client';

/* Cumulative "portfolio net" P&L for a single wallet, rendered with Recharts.
 * Portfolio net = realized cash (USDm in − out) + FMV of cards still held, so
 * the series ends at the page's headline Net P&L.
 *
 * Toggles:
 *   LINE | CANDLES — area line of the running total, or OHLC candlesticks
 *                    (events bucketed into ~40 periods: open = prior close,
 *                    high/low = net range in the period, close = net at end;
 *                    green when close ≥ open, red when below).
 *   TIME | PULLS   — X axis on wall-clock time, or the wallet's nth pull/sell.
 * The line has a brush strip to zoom/scroll; the candles zoom via scroll/drag/±
 * and re-aggregate so ~40 stay on screen (see useCandleZoom + buildCandles).
 *
 * Mounted-gated: Recharts needs the DOM, so we render a fixed-height placeholder
 * during SSR/hydration and swap in the chart on mount.
 *
 * The chart's parts live in ./pnl-chart (types, constants, formatters, the
 * candle builder, the zoom hook, and the presentational pieces). */

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Mono } from '../primitives';
import type { WalletPnlPoint } from '@/lib/queries';
import type { Candle, ChartType, XMode } from './pnl-chart/types';
import { HEIGHT, POS, NEG } from './pnl-chart/constants';
import { abbrUsd, fmtAxis } from './pnl-chart/format';
import { buildCandles } from './pnl-chart/buildCandles';
import { CandleShape } from './pnl-chart/CandleShape';
import { ChartTooltip } from './pnl-chart/tooltips';
import { makeEventDot } from './pnl-chart/eventDot';
import { Seg, ZoomBtn } from './pnl-chart/controls';
import { useCandleZoom } from './pnl-chart/useCandleZoom';

export default function WalletPnlChart({ points, net }: { points: WalletPnlPoint[]; net: number }) {
  const [mode, setMode] = useState<XMode>('pulls');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [mounted, setMounted] = useState(false);
  // Brush (zoom/scroll) window for the line, as data indices. Reset when the
  // data identity changes (toggling axis or chart type), since indices no
  // longer line up. The candle zoom lives in useCandleZoom.
  const [win, setWin] = useState<{ startIndex?: number; endIndex?: number }>({});
  const zoom = useCandleZoom(points, chartType, mode);

  useEffect(() => setMounted(true), []);
  useEffect(() => { setWin({}); }, [mode, chartType, points]);

  const pos = net >= 0;
  const color = pos ? POS : NEG;
  const xKey = mode === 'time' ? 'ts' : 'i';

  // Explicit, deduped ticks across the *visible* (brushed) window: many events
  // share an X value, so letting Recharts derive ticks produces duplicate tick
  // keys — and deriving from the window keeps labels correct while zoomed.
  const xTicks = useMemo(() => {
    if (points.length === 0) return [];
    const clamp = (n: number) => Math.max(0, Math.min(n, points.length - 1));
    const a = points[clamp(win.startIndex ?? 0)];
    const b = points[clamp(win.endIndex ?? points.length - 1)];
    const lo = mode === 'time' ? a.ts : a.i;
    const hi = mode === 'time' ? b.ts : b.i;
    if (hi <= lo) return [lo];
    const N = 6;
    const step = (hi - lo) / (N - 1);
    return [...new Set(Array.from({ length: N }, (_, k) => Math.round(lo + step * k)))];
  }, [points, mode, win]);

  const candleData = useMemo<Candle[]>(
    () => (chartType === 'candle' ? buildCandles(points, mode, zoom.cview) : []),
    [chartType, points, mode, zoom.cview],
  );
  const candleInterval = Math.max(0, Math.floor(candleData.length / 6)); // ~6 axis labels

  const onBrush = (r: { startIndex?: number; endIndex?: number }) =>
    setWin({ startIndex: r.startIndex, endIndex: r.endIndex });

  // Pull/sellback dots only when not too many are in view (zoom reveals them);
  // marketplace buys always show. Keeps the line readable on heavy traders.
  const eventDot = useMemo(() => {
    const s = win.startIndex ?? 0;
    const e = win.endIndex ?? points.length - 1;
    let pulls = 0, sells = 0;
    for (let k = Math.max(0, s); k <= Math.min(points.length - 1, e); k++) {
      const kind = points[k].kind;
      if (kind === 'pull') pulls++;
      else if (kind === 'sellback') sells++;
    }
    return makeEventDot(pulls <= 150, sells <= 150);
  }, [points, win]);

  // Fraction (from top) of the visible window where net crosses $0, so the
  // line fill/stroke can be green above water and the loss colour below it.
  const zeroOffset = useMemo(() => {
    if (points.length === 0) return 1;
    const clamp = (n: number) => Math.max(0, Math.min(n, points.length - 1));
    const s = clamp(win.startIndex ?? 0);
    const e = clamp(win.endIndex ?? points.length - 1);
    let mx = -Infinity, mn = Infinity;
    for (let k = s; k <= e; k++) { const v = points[k].net; if (v > mx) mx = v; if (v < mn) mn = v; }
    if (mx <= 0) return 0; // entirely under water → all loss colour
    if (mn >= 0) return 1; // entirely above water → all green
    return mx / (mx - mn);
  }, [points, win]);

  const sharedAxes = (
    <>
      <CartesianGrid stroke="var(--line-soft)" strokeOpacity={0.5} vertical={false} />
      <YAxis
        tickFormatter={(v: number) => abbrUsd(v)}
        tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
        stroke="var(--line-soft)"
        width={46}
      />
      <ReferenceLine y={0} stroke="var(--line)" strokeDasharray="3 3" />
      <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--fg-4)', strokeDasharray: '3 3' }} />
    </>
  );

  return (
    <div className="mx-3 mt-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      {/* Header: current net + toggles */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-3.5 pt-3">
        <div className="flex items-baseline gap-2">
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>PORTFOLIO NET</Mono>
          <Mono style={{ fontSize: 13, color }}>{pos ? '+' : ''}{abbrUsd(net)}</Mono>
        </div>
        <div className="flex items-center gap-2">
          <Seg
            value={chartType}
            onChange={v => setChartType(v as ChartType)}
            options={[{ k: 'line', label: 'LINE' }, { k: 'candle', label: 'CANDLES' }]}
          />
          <Seg
            value={mode}
            onChange={v => setMode(v as XMode)}
            options={[{ k: 'time', label: 'TIME' }, { k: 'pulls', label: 'PULLS&SELLS' }]}
          />
        </div>
      </div>

      {/* Candle zoom controls (re-aggregates to ~40 candles per view) */}
      {chartType === 'candle' && zoom.zoomable && (
        <div className="flex items-center justify-end gap-1.5 px-3.5 pt-1.5">
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.1em', marginRight: 2 }}>
            {zoom.candleZoomed ? `${zoom.eventsInView.toLocaleString('en-US')} events in view` : 'scroll or drag to zoom'}
          </Mono>
          {zoom.candleZoomed && <ZoomBtn label="⟲" title="Reset zoom" onClick={zoom.resetView} />}
          <ZoomBtn label="−" title="Zoom out" disabled={!zoom.candleZoomed} onClick={() => zoom.zoomCandles(1.45)} />
          <ZoomBtn label="+" title="Zoom in" disabled={!zoom.canZoomIn} onClick={() => zoom.zoomCandles(0.6)} />
        </div>
      )}

      {/* Chart */}
      <div style={{ height: HEIGHT, padding: '8px 6px 4px' }}>
        {!mounted || points.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>
              {points.length === 0 ? 'no pulls yet' : '…'}
            </Mono>
          </div>
        ) : chartType === 'line' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
              <defs>
                {/* Split at the $0 line: green above water, loss colour below. */}
                <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={POS} stopOpacity={0.32} />
                  <stop offset={zeroOffset} stopColor={POS} stopOpacity={0.04} />
                  <stop offset={zeroOffset} stopColor={NEG} stopOpacity={0.04} />
                  <stop offset={1} stopColor={NEG} stopOpacity={0.32} />
                </linearGradient>
                <linearGradient id="pnl-stroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={zeroOffset} stopColor={POS} />
                  <stop offset={zeroOffset} stopColor={NEG} />
                </linearGradient>
              </defs>
              {sharedAxes}
              <XAxis
                dataKey={xKey}
                type="number"
                domain={['dataMin', 'dataMax']}
                scale={mode === 'time' ? 'time' : 'linear'}
                ticks={xTicks}
                interval={0}
                tickFormatter={(v: number) => (mode === 'time' ? fmtAxis(v) : `#${v}`)}
                tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
                stroke="var(--line-soft)"
                minTickGap={36}
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="url(#pnl-stroke)"
                strokeWidth={1.5}
                fill="url(#pnl-fill)"
                dot={eventDot}
                activeDot={{ r: 3, fill: color, stroke: 'var(--bg)' }}
                isAnimationActive={false}
              />
              <Brush
                key={`brush-line-${mode}`}
                dataKey={xKey}
                height={18}
                travellerWidth={8}
                stroke="var(--line-soft)"
                fill="var(--bg-3)"
                tickFormatter={(v: number) => (mode === 'time' ? fmtAxis(v) : `#${v}`)}
                onChange={onBrush}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            ref={zoom.boxRef}
            onPointerDown={zoom.onPointerDown}
            onPointerMove={zoom.onPointerMove}
            onPointerUp={zoom.onPointerUp}
            onPointerLeave={zoom.onPointerUp}
            onDoubleClick={zoom.resetView}
            style={{ width: '100%', height: '100%', touchAction: 'pan-y', cursor: zoom.candleZoomed ? 'grab' : 'crosshair' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={candleData} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
                {sharedAxes}
                <XAxis
                  dataKey="k"
                  type="category"
                  interval={candleInterval}
                  tickFormatter={(v: number) => candleData[v]?.label ?? ''}
                  tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--fg-4)' }}
                  stroke="var(--line-soft)"
                />
                <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Visible formula / methodology */}
      <div className="px-3.5 pb-3" style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)', display: 'block', letterSpacing: '0.02em' }}>
          net = Σ(USDm in − out) + Σ FMV(cards held)
        </Mono>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', display: 'block', marginTop: 3, lineHeight: 1.6 }}>
          realized cash <span style={{ color: 'var(--fg-3)' }}>(in</span> = sellback payouts ·{' '}
          <span style={{ color: 'var(--fg-3)' }}>out</span> = pack &amp; marketplace spend) + current FMV of
          cards not yet sold — ends at the headline Net&nbsp;P&amp;L.
        </Mono>
      </div>
    </div>
  );
}
