import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCardDetail } from '@/lib/queries';
import {
  KpiTile,
  Lbl,
  Mono,
  SectionHead,
  StatusPill,
  TierTag,
  type Tier,
} from '@/components/primitives';
import { BackIcon } from '@/components/Icons';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

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

interface Params { slug: string }

export default async function CardDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const card = await getCardDetail(slug);
  if (!card) return notFound();

  const eyebrowBits = [card.card_set, card.year ? String(card.year) : null, card.grading]
    .filter((s): s is string => !!s);

  return (
    <div className="pb-6">
      {/* Back chip */}
      <div className="px-4 pt-3">
        <Link href="/cards" className="inline-flex items-center gap-1.5">
          <BackIcon />
          <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em' }}>
            BACK · CARDS
          </Mono>
        </Link>
      </div>

      {/* Eyebrow + title */}
      <div className="px-4 pt-3.5">
        {eyebrowBits.length > 0 && (
          <Lbl>{eyebrowBits.join(' · ').toUpperCase()}</Lbl>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            marginTop: 6,
            lineHeight: 1.2,
          }}
        >
          {card.title ?? 'Untitled card'}
        </h1>
        <Mono style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 4, display: 'block' }}>
          {card.serial_number && `cert · ${card.serial_number}`}
          {card.serial_number && card.slug && ' · '}
          {card.slug && `slug · ${card.slug}`}
        </Mono>
      </div>

      {/* Hero card */}
      <div className="mx-4 mt-3.5">
        <div
          className="relative"
          style={{
            aspectRatio: '5/7',
            background: card.image_front
              ? `center/contain no-repeat url("${card.image_front}"), var(--bg-3)`
              : `radial-gradient(circle at 30% 25%, oklch(0.42 0.06 85 / 0.4), transparent 50%), repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 6px, oklch(0.22 0.01 70) 6px, oklch(0.22 0.01 70) 12px)`,
            border: '1px solid color-mix(in oklch, var(--accent) 53%, transparent)',
            boxShadow:
              '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 16px 60px color-mix(in oklch, var(--accent) 12%, transparent)',
          }}
        >
          <div className="absolute inset-x-3 top-3 flex justify-between">
            <Mono style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.16em' }}>
              {card.grading ?? 'PSA'}
            </Mono>
            {card.player && (
              <Mono
                style={{
                  fontSize: 11,
                  color: 'var(--fg-3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
                  padding: '2px 6px',
                }}
              >
                {card.player}
              </Mono>
            )}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
            <div>
              <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>
                FMV at last pull
              </Mono>
              <Mono
                style={{
                  fontSize: 22,
                  color: 'var(--fg)',
                  display: 'block',
                  marginTop: 2,
                  background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
                  padding: '0 6px',
                }}
              >
                {card.last_fmv !== null ? usd(card.last_fmv) : '–'}
              </Mono>
            </div>
            {card.serial_number && (
              <Mono
                style={{
                  fontSize: 9,
                  color: 'var(--fg-4)',
                  letterSpacing: '0.12em',
                  background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
                  padding: '2px 6px',
                }}
              >
                #{card.serial_number}
              </Mono>
            )}
          </div>
        </div>
      </div>

      {/* 3 KPIs */}
      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <KpiTile label="Times pulled" value={card.pulls_total.toLocaleString('en-US')} />
        <KpiTile
          label="In vault"
          value={card.in_vault ? 'Yes' : 'No'}
          delta={card.in_vault ? 'held' : 'sold-back'}
          deltaDown={!card.in_vault}
        />
        <KpiTile
          label="MnStr FMV"
          value={card.last_fmv !== null ? usd(card.last_fmv) : '–'}
        />
      </div>

      {/* History */}
      <SectionHead tag="01 · HISTORY" title="Pull history" right={`${card.pulls_total} TOTAL`} />
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {card.history.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS</Mono>
          </div>
        ) : (
          card.history.map((h, i) => {
            const display = h.username ?? shortAddr(h.wallet);
            const net = (h.payout_usd ?? 0) - h.price_usd;
            return (
              <div
                key={h.request_id}
                className="px-3.5 py-3"
                style={{ borderTop: i === 0 ? 'none' : '1px dashed var(--line-soft)' }}
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
                  {shortAddr(h.wallet)} · {new Date(h.pulled_at).toLocaleString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
          })
        )}
      </div>

      {/* Comparables */}
      {card.comparables.length > 0 && (
        <>
          <SectionHead tag="02 · COMPS" title="Set comparables" right="MNSTR FMV" />
          <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
            {card.comparables.map((c, i) => (
              <Link
                key={c.slug}
                href={`/cards/${c.slug}`}
                className="flex justify-between px-3.5 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px dashed var(--line-soft)' }}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div
                    className="truncate"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
                  >
                    {c.title ?? c.slug}
                  </div>
                  <Mono style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2, display: 'block' }}>
                    {c.grading ?? '—'} · {c.pulls} pulled
                  </Mono>
                </div>
                <Mono style={{ fontSize: 12, color: 'var(--accent)', alignSelf: 'center' }}>
                  {c.fmv !== null ? usd(c.fmv) : '–'}
                </Mono>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Comps reflect <span style={{ color: 'var(--fg-3)' }}>MnStr FMV</span> at last sighting; not market consensus.
          <br />
          † {card.in_vault
            ? 'Currently held by a player. Status revalues on every poll.'
            : 'Sold back to a player. Last value reflects payout context.'}
        </Mono>
      </div>
    </div>
  );
}
