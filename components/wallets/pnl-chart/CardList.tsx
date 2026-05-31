import type { CardRef } from './types';

/* A tooltip card section: one card per line, but if it's a single card show its
 * picture (via the /img/{slug} proxy) instead of the title. */
export function CardList({ label, cards, color, max = 4 }: { label: string; cards: CardRef[]; color: string; max?: number }) {
  if (cards.length === 0) return null;
  const single = cards.length === 1 && cards[0].slug ? cards[0] : null;
  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ fontSize: 8, color, letterSpacing: '0.12em', marginBottom: single ? 2 : 1 }}>{label}</div>
      {single ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/img/${single.slug}`}
          alt={single.title}
          style={{ width: 160, height: 'auto', display: 'block', border: '1px solid var(--line-soft)' }}
        />
      ) : (
        <>
          {cards.slice(0, max).map((c, idx) => (
            <div key={idx} style={{ fontSize: 9, color: 'var(--fg)', whiteSpace: 'normal', lineHeight: 1.3 }}>· {c.title}</div>
          ))}
          {cards.length > max && (
            <div style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>+{cards.length - max} more</div>
          )}
        </>
      )}
    </div>
  );
}
