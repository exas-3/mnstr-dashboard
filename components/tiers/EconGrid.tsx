import { Lbl, Mono } from '../primitives';

export type Tone = 'pos' | 'neg' | 'neutral';

export interface EconItem {
  label: string;
  value: string;
  tone?: Tone;
}

export default function EconGrid({ items }: { items: EconItem[] }) {
  // Responsive: 2-col mobile, 4-col sm, 8-col lg+.
  // Using a 1px-gap trick: the parent's background bleeds through as a divider line.
  return (
    <div
      className="mx-3 grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-8"
      style={{
        background: 'var(--line-soft)',
        border: '1px solid var(--line-soft)',
      }}
    >
      {items.map((it, i) => (
        <div key={i} className="px-3 py-2.5" style={{ background: 'var(--bg-2)' }}>
          <Lbl style={{ fontSize: 8.5 }}>{it.label}</Lbl>
          <Mono
            style={{
              fontSize: 15,
              marginTop: 4,
              display: 'block',
              color:
                it.tone === 'pos'
                  ? 'var(--positive)'
                  : it.tone === 'neg'
                    ? 'var(--tier-magenta)'
                    : 'var(--fg)',
            }}
          >
            {it.value}
          </Mono>
        </div>
      ))}
    </div>
  );
}
