import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import type { HitRow } from '@/lib/queries';
import { agoShort, shortAddr } from '@/lib/format';

function sub(row: HitRow): string {
  const payout = row.payout_usd ? Number(row.payout_usd) : null;
  const fmv = row.fmv_usd ? Number(row.fmv_usd) : null;
  if (row.status === 'sold_back' && payout !== null) {
    return `+$${payout.toLocaleString('en-US', { maximumFractionDigits: 0 })} sold`;
  }
  if (fmv !== null) return `holding · $${fmv.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `paid $${Number(row.price_usd).toLocaleString('en-US')}`;
}

export default function LiveTickerStrip({ items }: { items: HitRow[] }) {
  return (
    <div
      className="mx-3 flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' as 'none' }}
    >
      {items.map(it => {
        const who = it.username ? `@${it.username}` : shortAddr(it.wallet);
        return (
          <div
            key={it.request_id}
            className="flex-shrink-0"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line-soft)',
              padding: '8px 10px',
              minWidth: 138,
            }}
          >
            <div className="flex items-center gap-1.5">
              <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>
                {agoShort(it.pulled_at)} ago
              </Mono>
              <TierTag tier={it.tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
            </div>
            <Link
              href={`/wallets/${it.wallet}`}
              className="mt-1 block truncate hover:underline"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg)' }}
            >
              {who}
            </Link>
            <Mono style={{ fontSize: 9.5, color: 'var(--accent)', marginTop: 2 }}>{sub(it)}</Mono>
          </div>
        );
      })}
    </div>
  );
}
