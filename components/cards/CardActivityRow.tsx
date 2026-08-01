import Link from 'next/link';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import { premiumFraction, type PremiumMode } from '@/lib/buyback';
import LocalTime from '../LocalTime';
import type { CardActivity } from '@/lib/queries';
import { shortAddr, usd } from '@/lib/format';

export default function CardActivityRow({
  ev,
  first,
  premiumMode = 'buyback',
}: {
  ev: CardActivity;
  first?: boolean;
  premiumMode?: PremiumMode;
}) {
  if (ev.kind === 'pull') {
    const display = ev.username ?? shortAddr(ev.wallet);
    const net = (ev.payout_usd ?? 0) - ev.price_usd;
    return (
      <div
        className="px-3.5 py-3"
        style={{ borderTop: first ? 'none' : '1px dashed var(--line-soft)' }}
      >
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.14em' }}>PULL</Mono>
            {/* Credit-paid pulls (price_usd = 0): no USDm out, the wallet paid
             * with internal mnstr credit. Flag so net = $0 makes sense. */}
            {ev.price_usd === 0 && (
              <Mono
                style={{
                  fontSize: 8.5,
                  color: 'var(--tier-cyan)',
                  letterSpacing: '0.14em',
                  padding: '1px 4px',
                  border: '1px solid color-mix(in oklch, var(--tier-cyan) 35%, transparent)',
                  background: 'color-mix(in oklch, var(--tier-cyan) 7%, transparent)',
                }}
              >
                CREDIT
              </Mono>
            )}
            <Link
              href={`/wallets/${ev.wallet}`}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)' }}
            >
              {display}
            </Link>
          </div>
          <TierTag tier={ev.tier as Tier} />
        </div>
        <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block' }}>
          {shortAddr(ev.wallet)} · <LocalTime iso={ev.ts} format="datetime-year" />
        </Mono>
        <div
          className="mt-3 flex items-center justify-between px-2.5 py-2"
          style={{ background: 'var(--bg-3)' }}
        >
          <div>
            <StatusPill status={ev.status} />
            {ev.payout_usd !== null && ev.status === 'sold_back' && (
              ev.payout_tx ? (
                <a
                  href={`https://mega.etherscan.io/tx/${ev.payout_tx}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="View payout transaction on MegaETH explorer"
                  style={{ display: 'block', marginTop: 2 }}
                >
                  <Mono style={{ fontSize: 11, color: 'var(--accent)' }}>
                    {usd(ev.payout_usd, ev.payout_usd < 100 ? 2 : 0)} payout ↗
                  </Mono>
                </a>
              ) : (
                <Mono style={{ fontSize: 11, color: 'var(--fg)', display: 'block', marginTop: 2 }}>
                  {usd(ev.payout_usd, ev.payout_usd < 100 ? 2 : 0)} payout
                </Mono>
              )
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

  // kind === 'sale'
  const sellerLabel = ev.seller_wallet
    ? (ev.seller_handle ? `@${ev.seller_handle}` : shortAddr(ev.seller_wallet))
    : 'MnStr vault';
  const premium = premiumFraction(ev.sale_price_usd, ev.sale_card_fmv, ev.tier, premiumMode);
  const premiumColor =
    premium == null ? 'var(--fg-4)'
    : premium >= 0 ? 'var(--positive)'
    : 'var(--tier-magenta)';
  const premiumLabel = premiumMode === 'buyback' ? 'vs buyback' : 'vs FMV';
  return (
    <div
      className="px-3.5 py-3"
      style={{ borderTop: first ? 'none' : '1px dashed var(--line-soft)' }}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.14em' }}>SALE</Mono>
          <span
            className="truncate"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
          >
            {ev.seller_wallet ? (
              <Link href={`/wallets/${ev.seller_wallet}`} style={{ color: 'var(--fg)' }}>
                {sellerLabel}
              </Link>
            ) : (
              <span style={{ color: 'var(--fg-4)' }}>{sellerLabel}</span>
            )}
            <span style={{ color: 'var(--fg-4)', margin: '0 4px' }}>→</span>
            <Link href={`/wallets/${ev.buyer}`} style={{ color: 'var(--fg)' }}>
              {shortAddr(ev.buyer)}
            </Link>
          </span>
        </div>
        {ev.tier && <TierTag tier={ev.tier as Tier} />}
      </div>
      <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block' }}>
        marketplace · <LocalTime iso={ev.ts} format="datetime-year" />
      </Mono>
      <div
        className="mt-3 flex items-center justify-between px-2.5 py-2"
        style={{ background: 'var(--bg-3)' }}
      >
        <a
          href={`https://mega.etherscan.io/tx/${ev.tx_hash}`}
          target="_blank"
          rel="noreferrer noopener"
          title="View sale transaction on MegaETH explorer"
        >
          <Mono style={{ fontSize: 11, color: 'var(--accent)' }}>
            {usd(ev.sale_price_usd, ev.sale_price_usd < 100 ? 2 : 0)} ↗
          </Mono>
        </a>
        {premium != null && (
          <Mono style={{ fontSize: 11, color: premiumColor }}>
            {premium >= 0 ? '+' : ''}{(premium * 100).toFixed(1)}% {premiumLabel}
          </Mono>
        )}
      </div>
    </div>
  );
}
