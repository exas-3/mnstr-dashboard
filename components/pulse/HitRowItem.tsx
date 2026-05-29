import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import { cardImageUrl } from '@/lib/img';
import LocalTime from '../LocalTime';
import type { HitRow } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

export default function HitRowItem({ hit, first }: { hit: HitRow; first?: boolean }) {
  const fmv = hit.fmv_usd ? Number(hit.fmv_usd) : 0;
  const hot = fmv >= 1000;
  const who = hit.username ? `@${hit.username}` : shortAddr(hit.wallet);
  const fmvLabel = fmv >= 10000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const inner = (
    <div
      className="grid items-center gap-2.5 px-3 py-2"
      style={{
        gridTemplateColumns: '46px 1fr auto',
        borderTop: first ? 'none' : '1px dashed var(--line-soft)',
      }}
    >
      {(() => {
        const img = cardImageUrl(hit.card_slug, hit.card_image_front);
        return (
          <div
            style={{
              aspectRatio: '5/7',
              background: img
                ? `center/contain no-repeat url("${img}")`
                : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
              border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
            }}
          />
        );
      })()}
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
        >
          {hit.card_title ?? 'unknown card'}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {hit.card_set && (
            <>
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>{hit.card_set}</Mono>
              <span style={{ color: 'var(--fg-4)' }}>·</span>
            </>
          )}
          <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>{who}</Mono>
          <TierTag tier={hit.tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono style={{ fontSize: 12, color: 'var(--accent)', display: 'block' }}>${fmvLabel}</Mono>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.08em', marginTop: 2, display: 'block' }}>
          <LocalTime iso={hit.pulled_at} format="datetime" />
        </Mono>
      </div>
    </div>
  );
  if (hit.card_slug) {
    return (
      <Link href={`/cards/${hit.card_slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
