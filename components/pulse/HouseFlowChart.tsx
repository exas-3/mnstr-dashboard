'use client';

/* Hand-rolled diverging-bar chart for the house's USDm cashflow, in the same
 * visual language as VelocityChart: inline SVG, CSS-var colors, hover cursor
 * + HTML tooltip, mounted-gated local-clock bucket labels.
 *
 * Per bucket: intake bar UP in accent (players paying the protocol), payout
 * bar DOWN in magenta (protocol paying players), and a neutral cumulative
 * net line (intake − payouts, running from zero at the window start). All
 * three share one dollar scale — the zero baseline sits wherever the
 * positive/negative extents put it. */

import { useEffect, useRef, useState } from 'react';
import { Lbl, Mono } from '../primitives';
import { abbrUsdStr } from '@/lib/format';

interface HouseFlowPoint {
  bucket: string;       // 'YYYY-MM-DD' daily or 'YYYY-MM-DD HH:00' hourly (UTC)
  intakeUsd: number;
  payoutUsd: number;
  cumNetUsd: number;
}

/* Signed variant for the net rows — abbrUsd only handles magnitudes. */
function signedAbbrUsd(n: number): string {
  return n < 0 ? `-${abbrUsdStr(-n)}` : abbrUsdStr(n);
}

/* Bucket label formatter — same convention as VelocityChart (which doesn't
 * export it): SQL emits buckets in UTC, parse as UTC, format in the user's
 * local clock once `local` flips true post-mount. SSR + first client render
 * use UTC so the HTML matches byte-for-byte. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function fmtBucket(iso: string, granularity: 'day' | 'hour', local: boolean): string {
  if (granularity === 'hour') {
    // "2026-05-26 14:00"
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

export default function HouseFlowChart({
  data,
  span = 30,
  granularity = 'day',
}: {
  data: HouseFlowPoint[];
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
          <Lbl>House flow · {span}{unit} · USD</Lbl>
        </div>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 120;

  // One shared dollar scale: positive extent covers the tallest intake bar
  // AND the cumulative-net peak; negative extent covers the deepest payout
  // bar AND any cumulative-net trough. The zero baseline lands wherever
  // those extents put it (cumulative net usually dominates the top).
  const yMax = Math.max(1, ...data.map(d => Math.max(d.intakeUsd, d.cumNetUsd)));
  const yMin = Math.min(0, ...data.map(d => Math.min(-d.payoutUsd, d.cumNetUsd)));
  const range = yMax - yMin;
  const y = (v: number) => ((yMax - v) / range) * H;
  const y0 = y(0);

  // Slot layout: each bucket owns W/n; bars sit centered in the slot with a
  // sliver of surface between neighbors (62% of the slot).
  const n = data.length;
  const dx = W / n;
  const barW = Math.max(1.2, dx * 0.62);
  const cx = (i: number) => (i + 0.5) * dx;

  const netLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(d.cumNetUsd).toFixed(1)}`)
    .join(' ');

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const t = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
    setHoverIdx(idx);
  }
  function onMouseLeave() {
    setHoverIdx(null);
  }

  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  // Tooltip percent-left within the chart, flipped to the left side when the
  // cursor is past 65% so it doesn't clip the right edge.
  const cursorPct = hoverIdx != null ? ((hoverIdx + 0.5) / n) * 100 : 0;
  const tooltipOnLeft = cursorPct > 65;

  return (
    <div
      ref={containerRef}
      className="mx-3 relative"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="flex items-baseline px-3 pt-2.5 pb-1.5">
        <Lbl>House flow · {span}{unit}</Lbl>
        <div className="ml-auto flex gap-3">
          <Mono style={{ fontSize: 8.5, color: 'var(--accent)' }}>● INTAKE</Mono>
          <Mono style={{ fontSize: 8.5, color: 'var(--negative)' }}>● PAYOUTS</Mono>
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-3)' }}>— NET (CUM)</Mono>
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
          {/* Intake fades toward the baseline; payout gradient is flipped so
           * the strong edge sits at the bar's far (bottom) end. */}
          <linearGradient id="houseflow-intake" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="houseflow-payout" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.08" />
            <stop offset="1" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g stroke="var(--line-soft)" strokeDasharray="2 4">
          <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} />
          <line x1="0" y1={H * 0.5}  x2={W} y2={H * 0.5}  />
          <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} />
        </g>
        {/* Zero baseline — solid, slightly stronger than the dashed grid. */}
        <line x1="0" y1={y0} x2={W} y2={y0} stroke="var(--line)" strokeWidth="0.5" />
        {data.map((d, i) => {
          const x = cx(i) - barW / 2;
          const inH = ((d.intakeUsd / range) * H);
          const outH = ((d.payoutUsd / range) * H);
          return (
            <g key={d.bucket}>
              {d.intakeUsd > 0 && (
                <>
                  <rect x={x} y={y0 - inH} width={barW} height={inH} fill="url(#houseflow-intake)" />
                  {/* solid cap at the data end */}
                  <rect x={x} y={y0 - inH} width={barW} height={Math.min(1.2, inH)} fill="var(--accent)" />
                </>
              )}
              {d.payoutUsd > 0 && (
                <>
                  <rect x={x} y={y0} width={barW} height={outH} fill="url(#houseflow-payout)" />
                  <rect x={x} y={y0 + outH - Math.min(1.2, outH)} width={barW} height={Math.min(1.2, outH)} fill="var(--negative)" />
                </>
              )}
            </g>
          );
        })}
        <path d={netLine} fill="none" stroke="var(--fg)" strokeWidth="1.2" />
        {/* Hover cursor: vertical line + dot on the cumulative-net line */}
        {hoverIdx != null && (
          <g pointerEvents="none">
            <line
              x1={cx(hoverIdx)}
              y1={0}
              x2={cx(hoverIdx)}
              y2={H}
              stroke="var(--fg-3)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={cx(hoverIdx)}
              cy={y(data[hoverIdx].cumNetUsd)}
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
          {fmtBucket(data[0].bucket, granularity, mounted)}
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
            {fmtBucket(hovered.bucket, granularity, mounted)}
          </Mono>
          <div className="mt-1.5 grid gap-0.5">
            <div className="flex items-center justify-between gap-3">
              <Mono style={{ fontSize: 9.5, color: 'var(--accent)' }}>● INTAKE</Mono>
              <Mono style={{ fontSize: 9.5, color: hovered.intakeUsd > 0 ? 'var(--fg)' : 'var(--fg-4)' }}>
                {abbrUsdStr(hovered.intakeUsd)}
              </Mono>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Mono style={{ fontSize: 9.5, color: 'var(--negative)' }}>● PAYOUTS</Mono>
              <Mono style={{ fontSize: 9.5, color: hovered.payoutUsd > 0 ? 'var(--fg)' : 'var(--fg-4)' }}>
                {abbrUsdStr(hovered.payoutUsd)}
              </Mono>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>● NET</Mono>
              <Mono style={{ fontSize: 9.5, color: 'var(--fg)' }}>
                {signedAbbrUsd(hovered.intakeUsd - hovered.payoutUsd)}
              </Mono>
            </div>
          </div>
          <div
            className="mt-1 pt-1 flex items-center justify-between"
            style={{ borderTop: '1px dashed var(--line-soft)' }}
          >
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>NET (CUM)</Mono>
            <Mono style={{ fontSize: 10, color: hovered.cumNetUsd >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
              {signedAbbrUsd(hovered.cumNetUsd)}
            </Mono>
          </div>
        </div>
      )}
    </div>
  );
}
