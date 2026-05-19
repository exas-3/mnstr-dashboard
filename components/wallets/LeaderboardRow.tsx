import Link from 'next/link';
import { Identicon, Mono, Sparkline } from '../primitives';
import type { WalletRow } from '@/lib/queries';

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

export default function LeaderboardRow({ row, first }: { row: WalletRow; first?: boolean }) {
  const isPos = row.net >= 0;
  const sparkColor = isPos ? 'var(--positive)' : 'var(--tier-magenta)';
  const display = row.handle ?? shortAddr(row.wallet);
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
            {row.handle && <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>{shortAddr(row.wallet)}</Mono>}
          </div>
          <div className="mt-0.5 flex gap-2.5">
            <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>
              {row.pulls.toLocaleString('en-US')} pulls
            </Mono>
            <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>· {abbrUsd(row.spend)} spent</Mono>
          </div>
        </div>
        <div className="text-right">
          <Mono style={{ fontSize: 13, color: sparkColor, display: 'block' }}>
            {isPos ? '+' : ''}
            {abbrUsd(row.net)}
          </Mono>
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
