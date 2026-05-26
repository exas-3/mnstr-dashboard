import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCardDetail, getCardActivity, getCardActivityCount } from '@/lib/queries';
import {
  KpiTile,
  Lbl,
  Mono,
  SectionHead,
  TierTag,
  type Tier,
} from '@/components/primitives';
import { BackIcon } from '@/components/Icons';
import CardHistoryLoadMore from '@/components/cards/CardHistoryLoadMore';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardDetail(slug);
  if (!card) {
    return { title: 'Card not found', robots: { index: false, follow: false } };
  }
  const title = card.title ?? slug;
  const setPart = card.card_set ?? 'unknown set';
  const fmv = card.last_fmv != null ? `$${Math.round(card.last_fmv).toLocaleString('en-US')}` : null;
  const desc = [
    `${title} from ${setPart}`,
    card.grading ? `· ${card.grading}` : null,
    `· pulled ${card.pulls_total.toLocaleString('en-US')} time${card.pulls_total === 1 ? '' : 's'}`,
    fmv ? `· vault FMV ${fmv}` : null,
  ].filter(Boolean).join(' ');
  return {
    title: `${title}${card.grading ? ` · ${card.grading}` : ''}`,
    description: desc,
    alternates: { canonical: `/cards/${slug}` },
    openGraph: {
      title,
      description: desc,
      url: `/cards/${slug}`,
      images: card.image_front ? [card.image_front] : ['/og-default.png'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: card.image_front ? [card.image_front] : ['/og-default.png'],
    },
  };
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

  // Recent history = interleaved pull + marketplace events for this slab.
  const [activity, activityTotal] = await Promise.all([
    getCardActivity(slug, 0, 20),
    getCardActivityCount(slug),
  ]);

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

      {/* Hero card — cap at 1250px so giant monitors don't render a 2000px slab */}
      <div className="mx-4 mt-3.5" style={{ maxWidth: 1250, marginLeft: 'auto', marginRight: 'auto' }}>
        <div
          className="relative"
          style={{
            aspectRatio: '5/7',
            background: card.image_front
              ? `center/contain no-repeat url("/img/${card.slug}"), var(--bg-3)`
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

      {/* Recent history — interleaved pulls + marketplace sales for this slab,
       * ordered DESC by timestamp. First 20 SSR'd; "Show more" appends 10 at
       * a time via /api/cards/[slug]/activity until exhausted. */}
      <SectionHead
        tag="01 · HISTORY"
        title="Recent history"
        right={`${activity.length} OF ${activityTotal.toLocaleString('en-US')}`}
      />
      <CardHistoryLoadMore slug={card.slug} initialRows={activity} totalEvents={activityTotal} />

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
