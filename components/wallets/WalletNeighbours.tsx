import Link from 'next/link';
import { Mono } from '../primitives';
import type { NeighbourRow } from '@/lib/queries';

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

export default function WalletNeighbours({ rows }: { rows: NeighbourRow[] }) {
  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      {rows.map((r, i) => {
        const display = r.handle ?? shortAddr(r.wallet);
        return (
          <Link
            key={r.wallet}
            href={`/wallets/${r.wallet}`}
            className="block px-3 py-2"
            style={{
              borderTop: i === 0 ? 'none' : '1px dashed var(--line-soft)',
              background: r.current ? 'var(--bg-3)' : 'transparent',
            }}
          >
            <div
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: '28px 1fr auto' }}
            >
              <Mono style={{ fontSize: 11, color: r.current ? 'var(--accent)' : 'var(--fg-4)' }}>
                {String(r.rank).padStart(2, '0')}
              </Mono>
              <div className="min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: r.current ? 'var(--fg)' : 'var(--fg-2)',
                    fontWeight: r.current ? 500 : 400,
                  }}
                >
                  {display}
                </div>
              </div>
              <Mono style={{ fontSize: 10, color: 'var(--fg-3)', textAlign: 'right' }}>
                {r.pulls.toLocaleString('en-US')} · {abbrUsd(r.spend)}
              </Mono>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
