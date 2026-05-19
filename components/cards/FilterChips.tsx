import Link from 'next/link';
import { Mono } from '../primitives';

export interface Chip<T extends string> {
  id: T;
  label: string;
}

export default function FilterChips<T extends string>({
  chips,
  value,
  build,
}: {
  chips: Chip<T>[];
  value: T;
  /** Given a chip id, return the URL the chip should link to. */
  build: (id: T) => string;
}) {
  return (
    <div
      className="mx-3 mt-3 flex gap-1.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' as 'none' }}
    >
      {chips.map(c => {
        const on = c.id === value;
        return (
          <Link
            key={c.id}
            href={build(c.id)}
            className="flex-shrink-0 whitespace-nowrap"
            style={{
              padding: '6px 10px',
              background: on ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'var(--bg-2)',
              border: `1px solid ${on ? 'color-mix(in oklch, var(--accent) 33%, transparent)' : 'var(--line-soft)'}`,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
              textTransform: 'uppercase',
            }}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
