/* Hand-rolled FMV distribution viz — mirrored histogram silhouette (a violin).
 * Bins come pre-bucketed from getTierFMVDistribution; this only renders.
 *
 * Coordinate system: viewBox 360 × 160 in CSS pixels.
 */

import { Lbl, Mono } from '../primitives';
import type { FmvDistribution } from '@/lib/queries';

const W = 360;
const H = 160;
const PAD_X = 16;
const PAD_TOP = 12;
const PAD_BOT = 24;
const CENTER_Y = (PAD_TOP + (H - PAD_BOT)) / 2;
const HALF_H = (H - PAD_TOP - PAD_BOT) / 2;

const BIN_MIN_LOG = 0;
const BIN_MAX_LOG = 5;

function xForLog10(v: number): number {
  // map log10 in [0, 5] → [PAD_X, W - PAD_X]
  const t = (v - BIN_MIN_LOG) / (BIN_MAX_LOG - BIN_MIN_LOG);
  return PAD_X + t * (W - 2 * PAD_X);
}

export default function ViolinChart({ data }: { data: FmvDistribution }) {
  if (data.n === 0 || data.bins.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="flex items-baseline px-3 pt-2.5 pb-1">
          <Lbl>FMV distribution · log $</Lbl>
        </div>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const peakCount = Math.max(...data.bins.map(b => b.count), 1);

  // Build top and bottom polylines, mirroring each bin's count.
  const topPts: Array<[number, number]> = [];
  const botPts: Array<[number, number]> = [];
  for (const bin of data.bins) {
    const x = xForLog10(bin.log10Mid);
    const halfH = (bin.count / peakCount) * HALF_H;
    topPts.push([x, CENTER_Y - halfH]);
    botPts.push([x, CENTER_Y + halfH]);
  }

  // Smooth via cardinal-like averaging of adjacent points.
  function smoothPath(pts: Array<[number, number]>, close = false): string {
    if (pts.length === 0) return '';
    const d: string[] = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      d.push(`Q${x0.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`);
    }
    const last = pts[pts.length - 1];
    d.push(`T${last[0].toFixed(1)},${last[1].toFixed(1)}`);
    if (close) d.push('Z');
    return d.join(' ');
  }

  // Combined fill: top L→R then bottom R→L.
  const fillPath =
    smoothPath(topPts) +
    ` L${botPts[botPts.length - 1][0].toFixed(1)},${botPts[botPts.length - 1][1].toFixed(1)} ` +
    smoothPath([...botPts].reverse()).replace(/^M/, 'L') +
    ' Z';

  const medianX = data.median !== null && data.median > 0 ? xForLog10(Math.log10(data.median)) : null;
  const priceX = data.price > 0 ? xForLog10(Math.log10(data.price)) : null;
  const outlier = data.outliers[0];
  const outlierX = outlier && outlier.fmv > 0 ? xForLog10(Math.log10(outlier.fmv)) : null;
  const outlierY = CENTER_Y - HALF_H * 0.9;

  const ticks = [10, 100, 1000, 10_000, 100_000];

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5">
        <Lbl>FMV distribution · log $</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-4)' }}>
          n = {data.n.toLocaleString('en-US')}
        </Mono>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160, display: 'block' }}>
        <defs>
          <linearGradient id="violin-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* price marker */}
        {priceX !== null && (
          <>
            <line
              x1={priceX}
              y1={PAD_TOP - 2}
              x2={priceX}
              y2={H - PAD_BOT + 4}
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
              price · ${data.price.toLocaleString('en-US')}
            </text>
          </>
        )}

        {/* the violin */}
        <path d={fillPath} fill="url(#violin-fill)" stroke="var(--accent)" strokeWidth="0.9" />

        {/* center line */}
        <line
          x1={PAD_X}
          y1={CENTER_Y}
          x2={W - PAD_X}
          y2={CENTER_Y}
          stroke="var(--line)"
          strokeDasharray="1 4"
          opacity="0.6"
        />

        {/* median tick */}
        {medianX !== null && (
          <>
            <line
              x1={medianX}
              y1={CENTER_Y - HALF_H * 0.5}
              x2={medianX}
              y2={CENTER_Y + HALF_H * 0.5}
              stroke="var(--fg)"
              strokeWidth="1.2"
            />
            <text
              x={medianX + 4}
              y={CENTER_Y + HALF_H + 12}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--fg-2)"
            >
              median · ${data.median!.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </text>
          </>
        )}

        {/* outlier dot */}
        {outlierX !== null && outlier && (
          <>
            <circle cx={outlierX} cy={outlierY} r="3" fill="var(--accent)" />
            <text
              x={outlierX - 4}
              y={outlierY - 5}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="8.5"
              fill="var(--accent)"
            >
              ${outlier.fmv.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              {outlier.title ? ` · ${outlier.title.split(' ').slice(0, 2).join(' ')}` : ''}
            </text>
          </>
        )}

        {/* x-axis ticks */}
        <g fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">
          {ticks.map(t => {
            const x = xForLog10(Math.log10(t));
            const label = t >= 1000 ? `$${t / 1000}k` : `$${t}`;
            return (
              <text key={t} x={x - 8} y={H - 6}>
                {label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
