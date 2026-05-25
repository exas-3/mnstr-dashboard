import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import type { TierOutlier } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

export default function OutlierRow({ outlier, first }: { outlier: TierOutlier; first?: boolean }) {
  const fmv = outlier.fmv_usd;
  const hot = fmv >= 1000;
  const fmvLabel =
    fmv >= 10000 ? Math.round(fmv).toLocaleString('en-US')
    : fmv.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Thumb + title link to the card detail. Pullers and tier tag are siblings
  // — keeps the HTML valid (no nested <a>) and works as a server component.
  const cardHref = outlier.card_slug ? `/cards/${outlier.card_slug}` : null;

  const titleEl = (
    <div
      className="truncate"
      style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
    >
      {outlier.card_title ?? 'unknown card'}
    </div>
  );

  return (
    <div
      className="grid items-center gap-2.5 px-3 py-2"
      style={{
        gridTemplateColumns: '46px 1fr 64px',
        borderTop: first ? 'none' : '1px dashed var(--line-soft)',
      }}
    >
      {cardHref ? (
        <Link href={cardHref}>
          <Thumb outlier={outlier} hot={hot} />
        </Link>
      ) : (
        <Thumb outlier={outlier} hot={hot} />
      )}

      <div className="min-w-0">
        {cardHref ? (
          <Link href={cardHref} className="hover:underline">
            {titleEl}
          </Link>
        ) : (
          titleEl
        )}
        <div className="mt-1 flex items-center gap-1.5">
          {outlier.card_set && (
            <>
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>{outlier.card_set}</Mono>
              <span style={{ color: 'var(--fg-4)' }}>·</span>
            </>
          )}
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-3)',
              minWidth: 0,
            }}
          >
            {outlier.pullers.length === 0 ? (
              <span style={{ color: 'var(--fg-4)' }}>—</span>
            ) : (
              outlier.pullers.map((p, i) => {
                const label = p.username ? `@${p.username}` : shortAddr(p.wallet);
                return (
                  <span key={p.wallet}>
                    {i > 0 && <span style={{ color: 'var(--fg-4)' }}>, </span>}
                    <Link
                      href={`/wallets/${p.wallet}`}
                      className="hover:underline"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      {label}
                    </Link>
                  </span>
                );
              })
            )}
          </span>
          <TierTag tier={outlier.tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
        </div>
      </div>

      <Mono style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'right' }}>
        ${fmvLabel}
        {outlier.pull_count > 1 && (
          <span style={{ color: 'var(--fg-4)', fontSize: 9, marginLeft: 4 }}>
            ×{outlier.pull_count}
          </span>
        )}
      </Mono>
    </div>
  );
}

function Thumb({ outlier, hot }: { outlier: TierOutlier; hot: boolean }) {
  const img = outlier.card_slug ? `/img/${outlier.card_slug}` : outlier.card_image_front;
  return (
    <div
      style={{
        aspectRatio: '5/7',
        background: img
          ? `center/contain no-repeat url("${img}"), var(--bg-3)`
          : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
        border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
      }}
    />
  );
}
