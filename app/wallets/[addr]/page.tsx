import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getWalletDetail,
  getWalletPullRhythm,
  getWalletNeighbours,
  getWalletActivity,
  getWalletActivityCount,
} from '@/lib/queries';
import {
  Identicon,
  KpiTile,
  Lbl,
  Mono,
  SectionHead,
  Sparkline,
  tierLabel,
} from '@/components/primitives';
import { BackIcon } from '@/components/Icons';
import WalletRhythm from '@/components/wallets/WalletRhythm';
import WalletNeighbours from '@/components/wallets/WalletNeighbours';
import WalletRecentLoadMore from '@/components/wallets/WalletRecentLoadMore';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ addr: string }> }): Promise<Metadata> {
  const { addr } = await params;
  const wallet = await getWalletDetail(addr);
  if (!wallet) {
    return { title: 'Wallet not found', robots: { index: false, follow: false } };
  }
  const display = wallet.handle ? `@${wallet.handle}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const sign = wallet.net >= 0 ? '+' : '';
  const netStr = `${sign}$${Math.round(wallet.net).toLocaleString('en-US')}`;
  const spendStr = `$${Math.round(wallet.spend).toLocaleString('en-US')}`;
  const desc = `${display} — rank #${wallet.rank}, net P&L ${netStr} on ${spendStr} spent across ${wallet.pulls.toLocaleString('en-US')} MnStr pulls.`;
  return {
    title: `${display} · rank #${wallet.rank}`,
    description: desc,
    alternates: { canonical: `/wallets/${addr}` },
    openGraph: {
      title: `${display} · MnStr · Watch`,
      description: desc,
      url: `/wallets/${addr}`,
      images: ['/og-default.png'],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${display} · MnStr · Watch`,
      description: desc,
      images: ['/og-default.png'],
    },
  };
}

const TIER_COLOR: Record<string, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
};

function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

function usd(n: number, frac = 0): string {
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

function abbrUsd(n: number): { value: string; unit?: string; sign?: string } {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return { value: `${sign}$${(abs / 1_000_000).toFixed(2)}`, unit: 'M' };
  if (abs >= 1_000)     return { value: `${sign}$${(abs / 1_000).toFixed(1)}`,    unit: 'k' };
  return { value: `${sign}$${Math.round(abs)}` };
}

interface Params { addr: string }

export default async function WalletDetailPage({ params }: { params: Promise<Params> }) {
  const { addr } = await params;
  const wallet = addr.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) return notFound();

  const [detail, rhythm, neighbours, activity, activityTotal] = await Promise.all([
    getWalletDetail(wallet),
    getWalletPullRhythm(wallet, 12),
    getWalletNeighbours(wallet, 3),
    getWalletActivity(wallet, 0, 12),
    getWalletActivityCount(wallet),
  ]);

  if (!detail) return notFound();

  const display = detail.handle ?? shortAddr(detail.wallet);
  const isPos = detail.net >= 0;
  const spend = abbrUsd(detail.spend);
  const payout = abbrUsd(detail.payout);
  const tierTotal = detail.tierMix.reduce((s, t) => s + t.pulls, 0);

  // Simple "+" / "-" sparkline based on pulls per recent week
  const spark = rhythm.map(r => r.pulls);

  return (
    <div className="pb-6">
      {/* Back chip */}
      <div className="px-4 pt-3">
        <Link href="/wallets" className="inline-flex items-center gap-1.5">
          <BackIcon />
          <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em' }}>
            BACK · WALLETS
          </Mono>
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-3">
          <Identicon addr={detail.wallet} size={44} />
          <div className="min-w-0 flex-1">
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {display}
            </div>
            <Mono style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>
              {shortAddr(detail.wallet)}
              {detail.rank > 0 && ` · rank #${detail.rank.toLocaleString('en-US')}`}
            </Mono>
          </div>
        </div>
      </div>

      {/* 3 KPIs */}
      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <KpiTile label="Pulls · all" value={detail.pulls.toLocaleString('en-US')} />
        <KpiTile label="Spend" value={spend.value} unit={spend.unit} />
        <KpiTile label="Payouts" value={payout.value} unit={payout.unit} />
      </div>

      {/* Net P&L panel */}
      <div
        className="mx-3 mt-2 px-3.5 py-3"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        <div className="flex items-baseline justify-between">
          <Lbl>Net P&amp;L · realised</Lbl>
          {spark.length > 1 && (
            <Mono
              style={{
                fontSize: 9,
                color: spark[spark.length - 1] >= spark[0] ? 'var(--positive)' : 'var(--tier-magenta)',
              }}
            >
              ● {spark[spark.length - 1] >= spark[0] ? 'up' : 'down'} 12wk
            </Mono>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-2.5">
          <Mono
            style={{
              fontSize: 28,
              color: isPos ? 'var(--positive)' : 'var(--tier-magenta)',
              letterSpacing: '-0.01em',
            }}
          >
            {isPos ? '+' : ''}
            {usd(detail.net, 0)}
          </Mono>
          {spark.length > 0 && (
            <Sparkline
              pts={spark}
              color={isPos ? 'var(--positive)' : 'var(--tier-magenta)'}
              w={70}
              h={22}
            />
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <Lbl style={{ fontSize: 8.5 }}>Held FMV</Lbl>
            <Mono style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>
              {usd(detail.vaultFmv)}
            </Mono>
          </div>
          <div>
            <Lbl style={{ fontSize: 8.5 }}>Sold-back</Lbl>
            <Mono style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>
              {usd(detail.payout)}
            </Mono>
          </div>
          <div>
            <Lbl style={{ fontSize: 8.5 }}>Big hits</Lbl>
            <Mono style={{ fontSize: 13, color: 'var(--accent)', marginTop: 3 }}>
              {detail.bigHits.toLocaleString('en-US')}
            </Mono>
          </div>
        </div>
      </div>

      {/* Tier mix */}
      <SectionHead tag="01 · TIER MIX" title="Where they spent" />
      <div
        className="mx-3 px-3.5 py-3"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        {tierTotal > 0 ? (
          <>
            <div className="flex gap-px" style={{ height: 8 }}>
              {detail.tierMix.map(t => (
                <div
                  key={t.tier}
                  style={{
                    width: `${(t.pulls / tierTotal) * 100}%`,
                    background: TIER_COLOR[t.tier] ?? 'var(--fg-3)',
                  }}
                />
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {(['Starter', 'Premium', 'Ultra', 'Adventure'] as const).map(tn => {
                const m = detail.tierMix.find(t => t.tier === tn);
                const c = TIER_COLOR[tn];
                return (
                  <div key={tn}>
                    <Mono style={{ fontSize: 9, color: c }}>● {tierLabel(tn).toUpperCase()}</Mono>
                    <Mono style={{ fontSize: 11, color: 'var(--fg)', display: 'block', marginTop: 2 }}>
                      {(m?.pulls ?? 0).toLocaleString('en-US')} pulls
                    </Mono>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS</Mono>
        )}
      </div>

      {/* Collection */}
      <SectionHead
        tag="02 · COLLECTION"
        title="Top FMV pulls"
        right={`${detail.collectionTotal.toLocaleString('en-US')} TOTAL`}
      />
      <div className="mx-3">
        {detail.collection.length === 0 ? (
          <div
            className="px-3 py-5 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
          >
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO ENRICHED PULLS</Mono>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {detail.collection.map(h => {
              const fmv = Number(h.fmv_usd ?? 0);
              const hot = fmv >= 1000;
              return (
                <Link key={h.request_id} href={h.card_slug ? `/cards/${h.card_slug}` : '#'}>
                  <div
                    className="relative flex flex-col justify-between p-1.5"
                    style={{
                      aspectRatio: '5/7',
                      background: (h.card_slug
                        ? `center/contain no-repeat url("/img/${h.card_slug}"), var(--bg-3)`
                        : h.card_image_front
                          ? `center/contain no-repeat url("${h.card_image_front}"), var(--bg-3)`
                          : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)'),
                      border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
                      boxShadow: hot
                        ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 0 18px color-mix(in oklch, var(--accent) 12%, transparent)'
                        : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <Mono
                        style={{
                          fontSize: 8,
                          color: TIER_COLOR[h.tier] ?? 'var(--fg-3)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {h.tier.toUpperCase()[0]}
                      </Mono>
                    </div>
                    <Mono
                      style={{
                        fontSize: 11,
                        color: 'var(--fg)',
                        background: 'color-mix(in oklch, var(--bg) 70%, transparent)',
                        padding: '1px 4px',
                        alignSelf: 'flex-start',
                      }}
                    >
                      ${fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0)}
                    </Mono>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent history — interleaved pulls + marketplace trades (buy + sell),
       * newest first. Client component appends 10 more per "Show more" click
       * via /api/wallets/[addr]/activity until the combined pool is empty. */}
      <SectionHead
        tag="03 · HISTORY"
        title="Recent history"
        right={`${activity.length} OF ${activityTotal.toLocaleString('en-US')}`}
      />
      <WalletRecentLoadMore
        wallet={detail.wallet}
        initialRows={activity}
        totalEvents={activityTotal}
      />

      {/* Rhythm */}
      <SectionHead tag="04 · RHYTHM" title="Pulls over time" right="12 WK" />
      <WalletRhythm data={rhythm} weeks={12} />

      {/* Neighbours */}
      <SectionHead tag="05 · NEIGHBOURS" title="Wallets near rank" right="±3" />
      <WalletNeighbours rows={neighbours} />

      {/* Footer */}
      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Wallet ↔ username comes from MnStr profile; public, voluntary.
          <br />
          † Net P&L revalues as held cards re-price; this view = realised only.
        </Mono>
      </div>

    </div>
  );
}
