import Link from 'next/link';
import { Lbl, Mono } from '../primitives';
import type { PnlMode } from '@/lib/queries';

export default function RealisedPaperToggle({ value, tier }: { value: PnlMode; tier: string }) {
  return (
    <div
      className="mx-3 mt-3.5 flex items-center gap-3 px-3.5 py-2.5"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="flex-1">
        <Lbl style={{ fontSize: 9, letterSpacing: '0.14em' }}>P&amp;L MODE</Lbl>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--fg-3)',
            marginTop: 2,
          }}
        >
          {value === 'realised'
            ? 'Counts only sold-back pulls.'
            : 'Assumes everyone sells at current FMV (× 0.85).'}
        </div>
      </div>
      <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
        {(['realised', 'paper'] as PnlMode[]).map((o, i) => {
          const on = o === value;
          const href = `/tiers?tier=${tier}${o === 'paper' ? '&mode=paper' : ''}`;
          return (
            <Link
              key={o}
              href={href}
              style={{
                padding: '6px 10px',
                background: on ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'transparent',
                borderRight: i === 0 ? '1px solid var(--line)' : 'none',
                color: on ? 'var(--accent)' : 'var(--fg-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {o}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
