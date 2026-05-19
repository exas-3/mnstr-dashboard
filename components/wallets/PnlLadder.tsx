import { Lbl, Mono } from '../primitives';
import type { LadderRow } from '@/lib/queries';

export default function PnlLadder({ rows }: { rows: LadderRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="mx-3 px-3 py-8 text-center"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
      </div>
    );
  }

  /* Layout:
   *   left half  = losers, biggest loss anchored at far left.
   *   right half = winners, biggest win anchored at far right.
   *   All bars grow DOWN from a baseline at the top of each half
   *   (negatives drop below, positives rise above the center line).
   *
   * Each side independently scales to its own max magnitude, so the chart
   * answers "shape of the winners cohort vs shape of the losers cohort"
   * rather than comparing absolute scales (Pulse already covers that). */
  const winners = rows.filter(r => r.net > 0).sort((a, b) => b.net - a.net); // largest first
  const losers  = rows.filter(r => r.net < 0).sort((a, b) => a.net - b.net); // most negative first
  const maxPos = Math.max(...winners.map(r => r.net), 1);
  const maxNeg = Math.max(...losers.map(r => -r.net), 1);

  const W = 360;
  const H = 130;
  const midY = H / 2;
  const sideW = (W - 8) / 2;       // 4px outer margin + small mid gap

  function bandFor(count: number) {
    const gap = count > 20 ? 1 : 2;
    const barW = Math.max(3, Math.floor(sideW / count) - gap);
    return { barW, step: barW + gap };
  }
  const winBand = bandFor(winners.length || 1);
  const losBand = bandFor(losers.length || 1);

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5 pb-1">
        <Lbl>Net P&amp;L · top {winners.length} winners vs top {losers.length} losers</Lbl>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <line x1="0" y1={midY} x2={W} y2={midY} stroke="var(--line)" />

        {/* Losers: anchored at left, biggest loss leftmost; bars hang below midline */}
        {losers.map((r, i) => {
          const h = (-r.net / maxNeg) * (midY - 14);
          const x = 4 + i * losBand.step;
          return (
            <rect
              key={'n' + i}
              x={x}
              y={midY}
              width={losBand.barW}
              height={Math.max(2, h)}
              fill="var(--tier-magenta)"
              opacity={Math.max(0.4, 0.9 - i * 0.015)}
            >
              <title>
                {r.handle ?? r.wallet}: −${Math.round(-r.net).toLocaleString('en-US')}
              </title>
            </rect>
          );
        })}

        {/* Winners: anchored at right, biggest win rightmost; bars rise above midline */}
        {winners.map((r, i) => {
          const h = (r.net / maxPos) * (midY - 14);
          const x = W - 4 - (i + 1) * winBand.step;
          return (
            <rect
              key={'p' + i}
              x={x}
              y={midY - h}
              width={winBand.barW}
              height={Math.max(2, h)}
              fill="var(--positive)"
              opacity={Math.max(0.4, 0.9 - i * 0.015)}
            >
              <title>
                {r.handle ?? r.wallet}: +${Math.round(r.net).toLocaleString('en-US')}
              </title>
            </rect>
          );
        })}

        {/* Headline labels */}
        {losers[0] && (
          <text x="4" y={H - 4} fontFamily="var(--font-mono)" fontSize="9" fill="var(--tier-magenta)">
            ▾ −${Math.round(-losers[0].net).toLocaleString('en-US')}
          </text>
        )}
        {winners[0] && (
          <text x={W - 4} y="12" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--positive)">
            +${Math.round(winners[0].net).toLocaleString('en-US')} ▴
          </text>
        )}

        {/* Side labels */}
        <text x="4" y="12" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">LOSERS</text>
        <text x={W - 4} y={H - 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">WINNERS</text>
      </svg>
    </div>
  );
}
