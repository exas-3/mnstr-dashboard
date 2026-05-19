import { Lbl, Mono } from '../primitives';

export type Tone = 'pos' | 'neg' | 'neutral';

export interface EconItem {
  label: string;
  value: string;
  tone?: Tone;
}

export default function EconGrid({ items }: { items: EconItem[] }) {
  return (
    <div
      className="mx-3 grid grid-cols-2"
      style={{ border: '1px solid var(--line-soft)' }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className="px-3 py-2.5"
          style={{
            background: 'var(--bg-2)',
            borderRight: i % 2 === 0 ? '1px solid var(--line-soft)' : 'none',
            borderTop: i >= 2 ? '1px solid var(--line-soft)' : 'none',
          }}
        >
          <Lbl style={{ fontSize: 8.5 }}>{it.label}</Lbl>
          <Mono
            style={{
              fontSize: 15,
              marginTop: 4,
              display: 'block',
              color:
                it.tone === 'pos' ? 'var(--positive)'
                : it.tone === 'neg' ? 'var(--tier-magenta)'
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
