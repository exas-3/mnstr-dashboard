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
 *   TIME | PULLS   — X axis on wall-clock time, or the wallet's nth pull.
 * Plus a brush strip to zoom (drag handles) and scroll/pan (drag the window).
 *
 * Mounted-gated: Recharts needs the DOM, so we render a fixed-height placeholder
 * during SSR/hydration and swap in the chart on mount. */

import { useEffect, useMemo, useRef, useState } from 'react';
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

type XMode = 'time' | 'pulls';
type ChartType = 'line' | 'candle';
const HEIGHT = 256; // includes the brush strip
const CANDLE_BUCKETS = 40;     // target candles on screen (re-aggregated on zoom);
                               // also the zoom-in floor — below this it's one
                               // candle per event, so zooming in is disabled.
const POS = 'var(--positive)';
const NEG = 'var(--tier-magenta)';

const KIND_LABEL: Record<string, string> = {
  pull: 'pull',
  sellback: 'sold back',
  cash: 'cash flow',
  buy: 'bought',
};

function abbrUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `${sign}$${Math.round(a)}`;
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
// Compact date + 24h time for the TIME-mode axis (e.g. "May 27 14:32").
function fmtAxis(ms: number): string {
  const t = new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmtDate(ms)} ${t}`;
}
function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface Candle { k: number; label: string; ts: number; i: number; open: number; high: number; low: number; close: number; range: [number, number]; pulls: string[]; buys: string[]; sells: string[]; }
const MKT_COLOR = 'var(--tier-cyan)';   // marketplace buys
const SELL_COLOR = 'var(--accent)';     // sellbacks

/* Custom candlestick shape: Recharts sizes the underlying floating bar from the
 * `range` = [low, high] value, so `y`/`height` give us the pixel mapping for
 * this candle's value span. We draw the wick (low→high) and the body
 * (open↔close) from that. */
function CandleShape(props: { x?: number; y?: number; width?: number; height?: number; payload?: Candle }) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const up = close >= open;
  const col = up ? POS : NEG;
  const cx = x + width / 2;
  if (!(high > low)) {
    return <line x1={x + width * 0.2} y1={y} x2={x + width * 0.8} y2={y} stroke={col} strokeWidth={1} />;
  }
  const scale = height / (high - low);
  const yOf = (v: number) => y + (high - v) * scale; // y == pixel of `high`
  const bodyTop = Math.min(yOf(open), yOf(close));
  const bodyH = Math.max(1, Math.abs(yOf(close) - yOf(open)));
  const w = Math.max(2, width * 0.62);
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={col} strokeWidth={1} />
      <rect x={cx - w / 2} y={bodyTop} width={w} height={bodyH} fill={col} fillOpacity={up ? 0.5 : 0.9} stroke={col} strokeWidth={1} />
    </g>
  );
}

interface LinePoint { net: number; ts: number; i: number; kind?: string; card?: string | null }
const CARD_VERB: Record<string, string> = { pull: 'pulled', sellback: 'sold', buy: 'bought' };

/* One card per line, under a small label, for the candle tooltip's range. */
function CardList({ label, cards, color, max = 4 }: { label: string; cards: string[]; color: string; max?: number }) {
  if (cards.length === 0) return null;
  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ fontSize: 8, color, letterSpacing: '0.12em', marginBottom: 1 }}>{label}</div>
      {cards.slice(0, max).map((c, idx) => (
        <div key={idx} style={{ fontSize: 9, color: 'var(--fg)', whiteSpace: 'normal', lineHeight: 1.3 }}>· {c}</div>
      ))}
      {cards.length > max && (
        <div style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>+{cards.length - max} more</div>
      )}
    </div>
  );
}
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: LinePoint | Candle }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if ('open' in p) {
    const up = p.close >= p.open;
    return (
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', padding: '6px 9px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ fontSize: 13, color: up ? POS : NEG }}>
          {p.close >= 0 ? '+' : '-'}${Math.abs(p.close).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          <span style={{ fontSize: 9, marginLeft: 5 }}>{up ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontSize: 8.5, color: 'var(--fg-3)', marginTop: 2 }}>
          O {abbrUsd(p.open)} · H {abbrUsd(p.high)} · L {abbrUsd(p.low)}
        </div>
        {(p.pulls.length > 0 || p.buys.length > 0 || p.sells.length > 0) && (
          <div style={{ maxWidth: 240 }}>
            <CardList label="PULLED" cards={p.pulls} color="var(--fg-3)" />
            <CardList label="BOUGHT · MARKET" cards={p.buys} color={MKT_COLOR} />
            <CardList label="SOLD" cards={p.sells} color={SELL_COLOR} />
          </div>
        )}
        <div style={{ fontSize: 8.5, color: 'var(--fg-4)', marginTop: 2 }}>{fmtAxis(p.ts)} · #{p.i}</div>
      </div>
    );
  }
  const pos = p.net >= 0;
  const kindLabel = p.kind && KIND_LABEL[p.kind] ? `${KIND_LABEL[p.kind]} · ` : '';
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', padding: '6px 9px', fontFamily: 'var(--font-mono)' }}>
      <div style={{ fontSize: 13, color: pos ? POS : NEG }}>
        {pos ? '+' : '-'}${Math.abs(p.net).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>
      {p.card && p.kind && CARD_VERB[p.kind] && (
        <div style={{ fontSize: 9.5, color: 'var(--fg)', marginTop: 3, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.3 }}>
          <span style={{ color: p.kind === 'sellback' ? SELL_COLOR : p.kind === 'buy' ? MKT_COLOR : 'var(--fg-3)' }}>{CARD_VERB[p.kind]}</span> {p.card}
        </div>
      )}
      <div style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2 }}>{kindLabel}{fmtDateTime(p.ts)} · #{p.i}</div>
    </div>
  );
}

/* Mark notable events on the line: marketplace buys (cyan square, always — they
 * are rare) and sellbacks (accent circle, only when `showSells` so a wallet
 * that sells thousands of cards doesn't bury the line; zoom in to reveal them).
 * Pulls aren't marked. The tooltip still names the card for any point. */
function makeEventDot(showSells: boolean) {
  return function EventDot(props: { cx?: number; cy?: number; index?: number; payload?: LinePoint }) {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null) return <g key={`d${index}`} />;
    if (payload?.kind === 'buy') {
      return <rect key={`d${index}`} x={cx - 2.6} y={cy - 2.6} width={5.2} height={5.2} fill={MKT_COLOR} stroke="var(--bg)" strokeWidth={0.7} />;
    }
    if (showSells && payload?.kind === 'sellback') {
      return <circle key={`d${index}`} cx={cx} cy={cy} r={2.6} fill={SELL_COLOR} stroke="var(--bg)" strokeWidth={0.7} />;
    }
    return <g key={`d${index}`} />;
  };
}

/* Two-option segmented control, matching the design system. */
function Seg({ value, options, onChange }: {
  value: string;
  options: Array<{ k: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div role="tablist" className="inline-flex" style={{ border: '1px solid var(--line-soft)', background: 'var(--bg)' }}>
      {options.map((o, idx) => {
        const on = o.k === value;
        return (
          <button
            key={o.k}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.k)}
            style={{
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
              background: on ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
              borderRight: idx < options.length - 1 ? '1px solid var(--line-soft)' : 'none',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ZoomBtn({ label, onClick, title, disabled }: { label: string; onClick: () => void; title?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 22, height: 18, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1,
        color: disabled ? 'var(--fg-4)' : 'var(--fg-2)', background: 'var(--bg)',
        border: '1px solid var(--line-soft)', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function WalletPnlChart({ points, net }: { points: WalletPnlPoint[]; net: number }) {
  const [mode, setMode] = useState<XMode>('pulls');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [mounted, setMounted] = useState(false);
  // Brush (zoom/scroll) window, as data indices. Reset when the data identity
  // changes (toggling axis or chart type), since indices no longer line up.
  const [win, setWin] = useState<{ startIndex?: number; endIndex?: number }>({});
  // Candle zoom: a window over the EVENT (point) indices. candleData re-buckets
  // the windowed events into ~CANDLE_BUCKETS, so zooming reveals finer candles
  // (always ~40 on screen) rather than just showing fewer of fixed buckets.
  // null = full range.
  const [cview, setCview] = useState<{ s: number; e: number } | null>(null);
  const candleBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; s: number; e: number; moved: boolean } | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => { setWin({}); setCview(null); }, [mode, chartType, points]);

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

  // OHLC candles over the (zoomed) event window. Open = prior close (candles
  // connect); high/low = net range in the bucket; close = net at bucket end.
  // The window's events are re-bucketed into ~CANDLE_BUCKETS on every zoom, so
  // the count on screen stays ~40 (until fewer events than buckets remain, then
  // it's one candle per event). PULLS&SELLS skips empty buckets.
  const candleData = useMemo<Candle[]>(() => {
    if (chartType !== 'candle' || points.length === 0) return [];
    const vS = cview ? cview.s : 0;
    const vE = cview ? cview.e : points.length - 1;
    const view = points.slice(vS, vE + 1);
    if (view.length === 0) return [];
    const xOf = (p: WalletPnlPoint) => (mode === 'time' ? p.ts : p.i);
    const lo = xOf(view[0]);
    const last = view[view.length - 1];
    const hi = xOf(last);
    const enterNet = vS > 0 ? points[vS - 1].net : 0; // net entering the window
    const cardOf = (p: WalletPnlPoint, into: { pulls: string[]; buys: string[]; sells: string[] }) => {
      if (!p.card) return;
      if (p.kind === 'sellback') into.sells.push(p.card);
      else if (p.kind === 'buy') into.buys.push(p.card);
      else if (p.kind === 'pull') into.pulls.push(p.card);
    };
    if (hi <= lo) {
      const acc = { pulls: [] as string[], buys: [] as string[], sells: [] as string[] };
      cardOf(last, acc);
      const o = enterNet, c = last.net;
      return [{ k: 0, label: mode === 'time' ? fmtAxis(last.ts) : `#${last.i}`, ts: last.ts, i: last.i, open: o, high: Math.max(o, c), low: Math.min(o, c), close: c, range: [Math.min(o, c), Math.max(o, c)], ...acc }];
    }
    const step = (hi - lo) / CANDLE_BUCKETS;
    const out: Candle[] = [];
    let pi = 0, prevClose = enterNet, lastTs = view[0].ts, lastI = view[0].i;
    for (let b = 0; b < CANDLE_BUCKETS; b++) {
      const edge = lo + step * (b + 1);
      const open = prevClose;
      let high = open, low = open, close = open, consumed = 0;
      const acc = { pulls: [] as string[], buys: [] as string[], sells: [] as string[] };
      while (pi < view.length && xOf(view[pi]) <= edge) {
        const v = view[pi].net;
        if (v > high) high = v;
        if (v < low) low = v;
        close = v;
        cardOf(view[pi], acc);
        lastTs = view[pi].ts; lastI = view[pi].i; pi++; consumed++;
      }
      prevClose = close;
      if (mode === 'pulls' && consumed === 0) continue;
      const center = Math.round(lo + step * (b + 0.5));
      out.push({
        k: out.length,
        label: mode === 'time' ? fmtAxis(center) : `#${lastI}`,
        ts: mode === 'time' ? center : lastTs,
        i: lastI,
        open, high, low, close, range: [low, high], ...acc,
      });
    }
    return out;
  }, [chartType, points, mode, cview]);

  // Keep ~6 candle-axis labels.
  const candleInterval = Math.max(0, Math.floor(candleData.length / 6));
  const candleZoomed = cview !== null;
  // Events visible now, and whether there's room to zoom in: once the view is
  // at/under CANDLE_BUCKETS events it's one candle per event, so no finer zoom.
  const eventsInView = cview ? cview.e - cview.s + 1 : points.length;
  const zoomable = points.length > CANDLE_BUCKETS;
  const canZoomIn = zoomable && eventsInView > CANDLE_BUCKETS;

  // Zoom the candle window (count-based) toward a fractional anchor (0..1).
  const zoomCandles = (factor: number, anchor = 0.5) => {
    if (factor < 1 && !canZoomIn) return;
    setCview(prev => {
      const s = prev ? prev.s : 0;
      const e = prev ? prev.e : points.length - 1;
      const count = e - s + 1;
      const nextCount = Math.max(CANDLE_BUCKETS, Math.min(points.length, Math.round(count * factor)));
      if (nextCount >= points.length) return null; // fully zoomed out
      const cursor = s + anchor * (count - 1);
      let ns = Math.round(cursor - anchor * (nextCount - 1));
      let ne = ns + nextCount - 1;
      if (ns < 0) { ns = 0; ne = nextCount - 1; }
      if (ne > points.length - 1) { ne = points.length - 1; ns = ne - (nextCount - 1); }
      return { s: Math.max(0, ns), e: ne };
    });
  };
  const plotFrac = (clientX: number) => {
    const el = candleBoxRef.current;
    if (!el) return 0.5;
    const r = el.getBoundingClientRect();
    const left = r.left + 52, right = r.right - 16; // ~ y-axis + paddings
    return Math.max(0, Math.min(1, (clientX - left) / Math.max(1, right - left)));
  };

  // Wheel-to-zoom (non-passive so we can preventDefault page scroll).
  useEffect(() => {
    const el = candleBoxRef.current;
    if (!el || chartType !== 'candle' || points.length <= CANDLE_BUCKETS) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      zoomCandles(ev.deltaY < 0 ? 0.82 : 1.22, plotFrac(ev.clientX));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, points.length]);

  const onCandlePointerDown = (ev: React.PointerEvent) => {
    if (chartType !== 'candle') return;
    dragRef.current = { x: ev.clientX, s: cview ? cview.s : 0, e: cview ? cview.e : points.length - 1, moved: false };
  };
  const onCandlePointerMove = (ev: React.PointerEvent) => {
    const d = dragRef.current;
    const el = candleBoxRef.current;
    if (!d || !el) return;
    const w = el.getBoundingClientRect().width - 68;
    const size = d.e - d.s;
    const deltaEvents = Math.round(-((ev.clientX - d.x) / Math.max(1, w)) * size);
    if (Math.abs(ev.clientX - d.x) > 3) d.moved = true;
    if (deltaEvents === 0) return;
    setCview(() => {
      let ns = d.s + deltaEvents, ne = d.e + deltaEvents;
      if (ns < 0) { ns = 0; ne = size; }
      if (ne > points.length - 1) { ne = points.length - 1; ns = ne - size; }
      return (ns <= 0 && ne >= points.length - 1) ? null : { s: Math.max(0, ns), e: ne };
    });
  };
  const onCandlePointerUp = () => { dragRef.current = null; };

  const onBrush = (r: { startIndex?: number; endIndex?: number }) =>
    setWin({ startIndex: r.startIndex, endIndex: r.endIndex });

  // Sellback dots only when not too many are in view (zoom reveals them);
  // marketplace buys always show. Keeps the line readable on heavy sellers.
  const eventDot = useMemo(() => {
    const s = win.startIndex ?? 0;
    const e = win.endIndex ?? points.length - 1;
    let sells = 0;
    for (let k = Math.max(0, s); k <= Math.min(points.length - 1, e); k++) {
      if (points[k].kind === 'sellback') sells++;
    }
    return makeEventDot(sells <= 150);
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
      {chartType === 'candle' && zoomable && (
        <div className="flex items-center justify-end gap-1.5 px-3.5 pt-1.5">
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.1em', marginRight: 2 }}>
            {candleZoomed ? `${eventsInView.toLocaleString('en-US')} events in view` : 'scroll or drag to zoom'}
          </Mono>
          {candleZoomed && <ZoomBtn label="⟲" title="Reset zoom" onClick={() => setCview(null)} />}
          <ZoomBtn label="−" title="Zoom out" disabled={!candleZoomed} onClick={() => zoomCandles(1.45)} />
          <ZoomBtn label="+" title="Zoom in" disabled={!canZoomIn} onClick={() => zoomCandles(0.6)} />
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
            ref={candleBoxRef}
            onPointerDown={onCandlePointerDown}
            onPointerMove={onCandlePointerMove}
            onPointerUp={onCandlePointerUp}
            onPointerLeave={onCandlePointerUp}
            onDoubleClick={() => setCview(null)}
            style={{ width: '100%', height: '100%', touchAction: 'pan-y', cursor: candleZoomed ? 'grab' : 'crosshair' }}
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
