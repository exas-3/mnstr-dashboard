import Link from 'next/link';
import { Identicon, Mono, Sparkline } from '../primitives';
import type { WalletRow, WalletSort } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

function abbrUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/* Row layout adapts to the active sort:
 *   pnl   → handle + spent line · big net P&L on the right
 *   spend → handle · big total spent on the right
 *   pulls → handle + spent line · big pull count on the right
 *
 * Total spent stays visible in every sort, since that's the single number
 * that makes the rest interpretable (P&L without spend is just a vibe). */
export default function LeaderboardRow({
  row,
  first,
  sort = 'pnl',
}: {
  row: WalletRow;
  first?: boolean;
  sort?: WalletSort;
}) {
  const isPos = row.net >= 0;
  const pnlColor = isPos ? 'var(--positive)' : 'var(--tier-magenta)';
  const display = row.handle ?? shortAddr(row.wallet);
  const sparkColor = sort === 'pnl' ? pnlColor : 'var(--fg-3)';

  return (
    <Link
      href={`/wallets/${row.wallet}`}
      className="block px-3 py-2.5"
      style={{ borderTop: first ? 'none' : '1px dashed var(--line-soft)' }}
    >
      <div
        className="grid items-center gap-2.5"
        style={{ gridTemplateColumns: '22px 26px 1fr auto' }}
      >
        <Mono style={{ fontSize: 11, color: 'var(--fg-4)' }}>
          {String(row.rank).padStart(2, '0')}
        </Mono>
        <Identicon addr={row.wallet} size={26} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--fg)',
                fontWeight: 500,
              }}
            >
              {display}
            </span>
            {row.handle && (
              <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>{shortAddr(row.wallet)}</Mono>
            )}
          </div>
          {sort !== 'spend' && (
            <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)', marginTop: 2, display: 'block' }}>
              {abbrUsd(row.spend)} spent
            </Mono>
          )}
        </div>
        <div className="text-right">
          {sort === 'pnl' && (
            <Mono style={{ fontSize: 13, color: pnlColor, display: 'block' }}>
              {isPos ? '+' : ''}
              {abbrUsd(row.net)}
            </Mono>
          )}
          {sort === 'spend' && (
            <Mono style={{ fontSize: 13, color: 'var(--fg)', display: 'block' }}>
              {abbrUsd(row.spend)}
            </Mono>
          )}
          {sort === 'pulls' && (
            <Mono style={{ fontSize: 13, color: 'var(--fg)', display: 'block' }}>
              {row.pulls.toLocaleString('en-US')}
              <span style={{ color: 'var(--fg-3)', fontSize: 9, marginLeft: 3 }}>pulls</span>
            </Mono>
          )}
          {row.spark.length > 0 && (
            <div className="mt-0.5 inline-block">
              <Sparkline pts={row.spark} color={sparkColor} w={60} h={14} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
