import Link from 'next/link';
import { Mono, tierLabel } from '../primitives';

const TIERS = [
  { id: 'Starter', sub: '$50' },
  { id: 'Premium', sub: '$250' },
  { id: 'Ultra',   sub: '$1,250' },
] as const;

export default function TierPicker({ value, mode }: { value: string; mode: string }) {
  return (
    <div
      className="mx-3 mt-3 grid grid-cols-3"
      style={{ border: '1px solid var(--line-soft)' }}
    >
      {TIERS.map((t, i) => {
        const on = t.id === value;
        const href = `/tiers?tier=${t.id}${mode === 'paper' ? '&mode=paper' : ''}`;
        return (
          <Link
            key={t.id}
            href={href}
            className="relative text-center"
            style={{
              padding: '12px 6px',
              background: on ? 'var(--bg-3)' : 'var(--bg-2)',
              borderRight: i === TIERS.length - 1 ? 'none' : '1px solid var(--line-soft)',
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
                  background: 'var(--accent)',
                  boxShadow: '0 0 10px var(--accent)',
                }}
              />
            )}
            <Mono
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                color: on ? 'var(--accent)' : 'var(--fg-3)',
                textTransform: 'uppercase',
              }}
            >
              {tierLabel(t.id)}
            </Mono>
            <Mono style={{ fontSize: 14, color: 'var(--fg)', display: 'block', marginTop: 3 }}>
              {t.sub}
            </Mono>
          </Link>
        );
      })}
    </div>
  );
}
