import Link from 'next/link';
import { Mono, tierLabel } from '../primitives';
import { CATEGORIES } from './tier-categories';

/* Mobile/tablet tier picker: one row per IP category (Pokemon, One Piece, …).
 * Desktop uses TierHeroRow which has the same category grouping with bigger
 * comparison cards. */
export default function TierPicker({ value }: { value: string }) {
  return (
    <div className="mx-3 mt-3 grid gap-2">
      {CATEGORIES.map(cat => (
        <section
          key={cat.key}
          style={{ border: '1px solid var(--line-soft)' }}
        >
          <div
            className="flex items-baseline justify-between px-3 py-1.5"
            style={{
              borderBottom: '1px solid var(--line-soft)',
              background: 'var(--bg-2)',
            }}
          >
            <Mono
              style={{
                fontSize: 9,
                color: cat.color,
                letterSpacing: '0.18em',
                textShadow: `0 0 6px color-mix(in oklch, ${cat.color} 25%, transparent)`,
              }}
            >
              {cat.label}
            </Mono>
            <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
              {cat.tiers.length} {cat.tiers.length === 1 ? 'PACK' : 'PACKS'}
            </Mono>
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cat.tiers.length}, minmax(0, 1fr))` }}
          >
            {cat.tiers.map((t, i) => {
              const on = t.key === value;
              const href = `/tiers?tier=${t.key}`;
              return (
                <Link
                  key={t.key}
                  href={href}
                  className="relative text-center"
                  style={{
                    padding: '12px 6px',
                    background: on ? 'var(--bg-3)' : 'var(--bg-2)',
                    borderRight: i === cat.tiers.length - 1 ? 'none' : '1px solid var(--line-soft)',
                  }}
                >
                  {on && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: -1,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: cat.color,
                        boxShadow: `0 0 10px ${cat.color}`,
                      }}
                    />
                  )}
                  <Mono
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: on ? cat.color : 'var(--fg-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tierLabel(t.key)}
                  </Mono>
                  <Mono style={{ fontSize: 14, color: 'var(--fg)', display: 'block', marginTop: 3 }}>
                    {t.priceLabel}
                  </Mono>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
