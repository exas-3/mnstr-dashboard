import Link from 'next/link';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import type { CardHistoryEntry } from '@/lib/queries';
import { shortAddr, usd } from '@/lib/format';

/* UTC-fixed manual date format. Same reason as HitRowItem: Node ICU and
 * Chrome V8 ICU disagree on Intl.DateTimeFormat output for subtle reasons
 * (narrow no-break spaces in some hour-minute formats), which trips React
 * #418 when this row is rendered from a client component for load-more. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const m = MONTHS[d.getUTCMonth()];
  const y = d.getUTCFullYear();
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${m} ${y} · ${h}:${min}`;
}

export default function CardHistoryRow({ h, first }: { h: CardHistoryEntry; first?: boolean }) {
  const display = h.username ?? shortAddr(h.wallet);
  const net = (h.payout_usd ?? 0) - h.price_usd;
  return (
    <div
      className="px-3.5 py-3"
      style={{ borderTop: first ? 'none' : '1px dashed var(--line-soft)' }}
    >
      <div className="flex items-baseline justify-between">
        <Link
          href={`/wallets/${h.wallet}`}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)' }}
        >
          {display}
        </Link>
        <TierTag tier={h.tier as Tier} />
      </div>
      <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block' }}>
        {shortAddr(h.wallet)} · {fmtDate(h.pulled_at)}
      </Mono>
      <div
        className="mt-3 flex items-center justify-between px-2.5 py-2"
        style={{ background: 'var(--bg-3)' }}
      >
        <div>
          <StatusPill status={h.status} />
          {h.payout_usd !== null && h.status === 'sold_back' && (
            <Mono
              style={{
                fontSize: 11,
                color: 'var(--fg)',
                display: 'block',
                marginTop: 2,
              }}
            >
              {usd(h.payout_usd, h.payout_usd < 100 ? 2 : 0)} payout
            </Mono>
          )}
        </div>
        <Mono
          style={{
            fontSize: 11,
            color: net >= 0 ? 'var(--positive)' : 'var(--tier-magenta)',
          }}
        >
          {net >= 0 ? '+' : ''}
          {usd(net, Math.abs(net) < 100 ? 2 : 0)} net
        </Mono>
      </div>
    </div>
  );
}
