import Link from 'next/link';
import { Mono } from '../primitives';

/* Segmented control for switching between Player EV bases:
 *   BUYBACK — fmv × per-tier rate (realizable cash value)
 *   FMV     — raw fmv (mnstr-displayed value, not actually payable)
 *
 * URL-driven (?ev=buyback|fmv) so it preserves SSR + ISR caching. Default
 * is BUYBACK because that's the cash a player actually walks away with.
 *
 * `preserveTier` forwards the current ?tier= query so the toggle doesn't
 * reset the user's active tier when they click. */
export default function EvBasisToggle({
  basis,
  tier,
}: {
  basis: 'buyback' | 'fmv';
  tier?: string;
}) {
  const options: Array<{ key: 'buyback' | 'fmv'; label: string }> = [
    { key: 'buyback', label: 'BUYBACK' },
    { key: 'fmv',     label: 'FMV' },
  ];
  const tierParam = tier ? `tier=${encodeURIComponent(tier)}&` : '';
  return (
    <div className="mx-3 mt-2 mb-2 flex items-center justify-end gap-2">
      <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
        PLAYER EV BASIS
      </Mono>
      <div
        role="tablist"
        className="inline-flex"
        style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}
      >
        {options.map(o => {
          const on = o.key === basis;
          const href = o.key === 'buyback'
            ? (tier ? `?tier=${encodeURIComponent(tier)}` : '/tiers')
            : `?${tierParam}ev=fmv`;
          return (
            <Link
              key={o.key}
              href={href}
              role="tab"
              aria-selected={on}
              scroll={false}
              prefetch={false}
              style={{
                padding: '5px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.14em',
                color: on ? 'var(--accent)' : 'var(--fg-3)',
                background: on ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
                borderRight: o.key === 'buyback' ? '1px solid var(--line-soft)' : 'none',
                textDecoration: 'none',
              }}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
