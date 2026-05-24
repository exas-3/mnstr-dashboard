import { Lbl, Mono } from '../primitives';
import type { LadderRow, WalletSort } from '@/lib/queries';

const W = 360;
const H = 130;

/* Compact form is kept ONLY for y-axis tick labels (the chart is ~360px wide
 * so a `$200,000` label there would eat half the row). Everywhere else we
 * show full integers per the wallets-page convention. */
function fmtCompact(n: number, asUsd: boolean): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (asUsd) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  }
  return Math.round(abs).toLocaleString('en-US');
}

function fmtFull(n: number, asUsd: boolean): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.round(Math.abs(n));
  return asUsd ? `${sign}$${abs.toLocaleString('en-US')}` : abs.toLocaleString('en-US');
}

export default function PnlLadder({ rows, sort }: { rows: LadderRow[]; sort: WalletSort }) {
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

  /* ┌─────────────────────────────────────────────────────────────────┐
   * │  Y-AXIS IS LOG SCALE (base 10, +1 offset for sub-dollar values). │
   * │  Linear flattens the bottom 90% of any heavy-tailed distribution │
   * │  to invisibility — log keeps the shape readable. Y-axis ticks    │
   * │  are explicit so you can recover magnitude at a glance.          │
   * └─────────────────────────────────────────────────────────────────┘ */
  const lg = (v: number) => Math.log10(1 + Math.abs(v));

  const asUsd = sort !== 'pulls';
  // Tracks the leaderboard's sort: same wallets, same order, top-K.
  // Bar color matches the sort metric's tone.
  const palette =
    sort === 'pnl'   ? 'var(--positive)'
    : sort === 'spend' ? 'var(--accent)'
    : 'var(--tier-blue)';
  const titleLabel =
    sort === 'pnl'   ? 'Net P&L'
    : sort === 'spend' ? 'Spend'
    : 'Pulls';

  const sorted = rows;
  const sharedMax = lg(Math.max(...sorted.map(r => Math.abs(r.value)), 1));

  const padX = 4;
  const padLeft = 32;          // room for y-axis labels
  const padTop = 16;
  const baseY = H - 4;
  const usableH = baseY - padTop;
  const usableW = W - padLeft - padX;
  const showTooltips = sorted.length <= 200;

  // Tick set depends on sort. PNL/spend ticks include 8000 per request.
  const Y_TICKS: number[] =
    sort === 'pulls'
      ? [1, 10, 100, 500, 2000]
      : [10, 100, 1000, 8000, 25000];

  const gap = sorted.length > 100 ? 0 : sorted.length > 20 ? 1 : 2;
  const barW = Math.max(0.4, (usableW / sorted.length) - gap);
  const step = barW + gap;

  const top = sorted[0];
  const sumAll = sorted.reduce((s, r) => s + Math.abs(r.value), 0);

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5 pb-1">
        <Lbl>
          {titleLabel} · top {sorted.length.toLocaleString('en-US')} wallets
        </Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-4)' }}>
          LOG · Σ {fmtFull(sumAll, asUsd)}
        </Mono>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: H, display: 'block' }}
      >
        {/* Y-axis tick gridlines + labels. */}
        {Y_TICKS.map(tick => {
          const frac = lg(tick) / sharedMax;
          if (frac > 1.02) return null;
          const y = baseY - frac * usableH;
          const label = asUsd
            ? (tick >= 1000 ? `$${tick / 1000}k` : `$${tick}`)
            : tick.toLocaleString('en-US');
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={W - padX}
                y2={y}
                stroke="var(--line-soft)"
                strokeDasharray="1 5"
              />
              <text
                x={padLeft - 3}
                y={y + 3}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize="8.5"
                fill="var(--fg-4)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Baseline. */}
        <line x1={padLeft} y1={baseY} x2={W - padX} y2={baseY} stroke="var(--line)" />

        {/* Bars — descending from left, biggest first. */}
        {sorted.map((r, i) => {
          const h = (lg(Math.abs(r.value)) / sharedMax) * usableH;
          const x = padLeft + i * step;
          return (
            <rect
              key={i}
              x={x}
              y={baseY - h}
              width={barW}
              height={Math.max(0.5, h)}
              fill={palette}
              opacity={Math.max(0.4, 0.95 - i * (0.55 / Math.max(1, sorted.length)))}
            >
              {showTooltips && (
                <title>
                  {r.handle ?? r.wallet}: {fmtFull(r.value, asUsd)}
                </title>
              )}
            </rect>
          );
        })}

        {/* Top callout. */}
        {top && (
          <text
            x={W - padX}
            y={padTop - 4}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill={palette}
          >
            ▴ {top.handle ?? top.wallet.slice(0, 6) + '…' + top.wallet.slice(-4)} · {fmtFull(top.value, asUsd)}
          </text>
        )}
      </svg>
    </div>
  );
}
