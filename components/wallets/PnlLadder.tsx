import { Lbl, Mono } from '../primitives';
import type { LadderRow, WalletSort } from '@/lib/queries';

const W = 360;
const H = 130;

function fmtCompact(n: number, asUsd: boolean): string {
  const abs = Math.abs(n);
  if (asUsd) {
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
    return `$${Math.round(n).toLocaleString('en-US')}`;
  }
  return Math.round(n).toLocaleString('en-US');
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

  if (sort === 'pnl') return <PnlSplitLadder rows={rows} />;
  return <SingleSideLadder rows={rows} sort={sort} />;
}

/* ── Winners vs losers, ranked bars sharing one bottom baseline ───────── */
function PnlSplitLadder({ rows }: { rows: LadderRow[] }) {
  const winners = rows.filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const losers  = rows.filter(r => r.value < 0).sort((a, b) => a.value - b.value);
  // Log scale (base 10, +1 offset for sub-dollar values). With ~1k wallets
  // ranging from $1 to $25k, linear scale flattens the bottom 90% to nothing;
  // log makes the shape of the distribution readable.
  const lg = (v: number) => Math.log10(1 + Math.abs(v));
  // Single shared y-axis: both sides scale to the largest magnitude on the
  // chart, so heights are directly comparable.
  const sharedMax = lg(Math.max(
    ...winners.map(r => r.value),
    ...losers.map(r => -r.value),
    1,
  ));
  const totalCount = winners.length + losers.length;
  const showTooltips = totalCount <= 200;

  /* Both groups grow UP from a single baseline at the bottom. The split
   * point along the X axis is *proportional* to each side's count — if 128
   * of 1,067 wallets are profitable, winners get 12% of the chart width and
   * losers get 88%. So the chart simultaneously shows two things:
   *   - horizontal area = count of wallets in each group
   *   - bar height      = magnitude of their P&L (log scale, shared y)
   */
  const padX = 4;
  const padTop = 22;
  const baseY = H - 4;
  const usableH = baseY - padTop;
  const fullW = W - padX * 2;
  const total = Math.max(1, winners.length + losers.length);
  const losersW = fullW * (losers.length / total);
  const winnersW = fullW - losersW;
  const splitX = padX + losersW;

  function band(count: number, allocatedW: number) {
    const c = Math.max(1, count);
    const per = allocatedW / c;
    const gap = per > 6 ? 2 : per > 3 ? 1 : 0;
    return { barW: Math.max(0.5, per - gap), step: per };
  }
  const winBand = band(winners.length, winnersW);
  const losBand = band(losers.length, losersW);

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5 pb-1">
        <Lbl>Net P&amp;L · {winners.length.toLocaleString('en-US')} winners vs {losers.length.toLocaleString('en-US')} losers</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-4)' }}>LOG $</Mono>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: H, display: 'block' }}
      >
        {/* Decade gridlines at $10, $100, $1k, $10k. */}
        {[1, 2, 3, 4].map(decade => {
          const frac = decade / sharedMax;
          if (frac > 1) return null;
          const y = baseY - frac * usableH;
          return (
            <line
              key={decade}
              x1="0"
              y1={y}
              x2={W}
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="1 5"
            />
          );
        })}

        {/* Shared baseline. */}
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="var(--line)" />

        {/* Vertical separator at the split point — proportional to each side's
         * share of the population, not the chart's geometric center. */}
        <line
          x1={splitX}
          y1={padTop}
          x2={splitX}
          y2={baseY}
          stroke="var(--line-soft)"
          strokeDasharray="2 3"
          opacity="0.6"
        />

        {/* Losers — biggest loss on the LEFT edge, growing in toward center. */}
        {losers.map((r, i) => {
          const h = (lg(-r.value) / sharedMax) * usableH;
          const x = padX + i * losBand.step;
          return (
            <rect
              key={'n' + i}
              x={x}
              y={baseY - h}
              width={losBand.barW}
              height={Math.max(0.5, h)}
              fill="var(--tier-magenta)"
              opacity={Math.max(0.45, 0.95 - i * (0.5 / Math.max(1, losers.length)))}
            >
              {showTooltips && (
                <title>
                  {r.handle ?? r.wallet}: −${Math.round(-r.value).toLocaleString('en-US')}
                </title>
              )}
            </rect>
          );
        })}

        {/* Winners — biggest win on the RIGHT edge, growing in toward center. */}
        {winners.map((r, i) => {
          const h = (lg(r.value) / sharedMax) * usableH;
          const x = W - padX - (i + 1) * winBand.step;
          return (
            <rect
              key={'p' + i}
              x={x}
              y={baseY - h}
              width={winBand.barW}
              height={Math.max(0.5, h)}
              fill="var(--positive)"
              opacity={Math.max(0.45, 0.95 - i * (0.5 / Math.max(1, winners.length)))}
            >
              {showTooltips && (
                <title>
                  {r.handle ?? r.wallet}: +${Math.round(r.value).toLocaleString('en-US')}
                </title>
              )}
            </rect>
          );
        })}

        {/* Corner labels & extreme callouts. */}
        <text x="4" y="14" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">LOSERS</text>
        <text x={W - 4} y="14" textAnchor="end" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--fg-4)">WINNERS</text>
        {losers[0] && (
          <text x="4" y="24" fontFamily="var(--font-mono)" fontSize="9" fill="var(--tier-magenta)">
            ▾ −${Math.round(-losers[0].value).toLocaleString('en-US')}
          </text>
        )}
        {winners[0] && (
          <text x={W - 4} y="24" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--positive)">
            +${Math.round(winners[0].value).toLocaleString('en-US')} ▴
          </text>
        )}
      </svg>
    </div>
  );
}

/* ── Single-side ranked bars (spend / pulls) ──────────────────────────── */
function SingleSideLadder({ rows, sort }: { rows: LadderRow[]; sort: 'spend' | 'pulls' }) {
  // Already DESC from query; keep as-is. Tallest bar on the left.
  const sorted = rows;
  const max = Math.max(...sorted.map(r => r.value), 1);
  const asUsd = sort === 'spend';
  const accent = 'var(--accent)';

  const padX = 4;
  const usableW = W - padX * 2;
  const gap = sorted.length > 20 ? 1 : 2;
  const barW = Math.max(3, Math.floor(usableW / sorted.length) - gap);
  const step = barW + gap;
  const topY = 22; // leave room for the top label
  const baseY = H - 4;
  const usableH = baseY - topY;

  const top = sorted[0];
  const total = sorted.reduce((s, r) => s + r.value, 0);

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5 pb-1">
        <Lbl>{sort === 'spend' ? 'Spend' : 'Pulls'} · top {sorted.length} wallets</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-4)' }}>
          Σ {fmtCompact(total, asUsd)}
        </Mono>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="var(--line)" />
        {sorted.map((r, i) => {
          const h = (r.value / max) * usableH;
          const x = padX + i * step;
          return (
            <rect
              key={i}
              x={x}
              y={baseY - h}
              width={barW}
              height={Math.max(2, h)}
              fill={accent}
              opacity={Math.max(0.4, 0.95 - i * 0.018)}
            >
              <title>
                {r.handle ?? r.wallet}: {fmtCompact(r.value, asUsd)}
              </title>
            </rect>
          );
        })}
        {top && (
          <text x={padX} y="14" fontFamily="var(--font-mono)" fontSize="9" fill={accent}>
            ▴ {top.handle ?? top.wallet.slice(0, 6) + '…' + top.wallet.slice(-4)} · {fmtCompact(top.value, asUsd)}
          </text>
        )}
      </svg>
    </div>
  );
}
