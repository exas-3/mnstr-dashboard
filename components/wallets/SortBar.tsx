import Link from 'next/link';
import { Mono } from '../primitives';
import type { WalletSort } from '@/lib/queries';

const OPTS: Array<{ id: WalletSort; label: string }> = [
  { id: 'pnl',   label: 'Net P&L' },
  { id: 'spend', label: 'Spend'   },
  { id: 'pulls', label: 'Pulls'   },
];

export default function SortBar({ value, q }: { value: WalletSort; q?: string }) {
  return (
    <div
      className="mx-3 mt-3 flex"
      style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}
    >
      {OPTS.map((o, i) => {
        const on = o.id === value;
        const search = new URLSearchParams();
        if (o.id !== 'pnl') search.set('sort', o.id);
        if (q) search.set('q', q);
        const qs = search.toString();
        const href = qs ? `/wallets?${qs}` : '/wallets';
        return (
          <Link
            key={o.id}
            href={href}
            className="relative flex-1 text-center"
            style={{
              padding: '9px 0',
              background: on ? 'var(--bg-3)' : 'transparent',
              borderRight: i === OPTS.length - 1 ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            {on && (
              <span
                aria-hidden
                style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 2, background: 'var(--accent)' }}
              />
            )}
            <Mono
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: on ? 'var(--accent)' : 'var(--fg-3)',
              }}
            >
              {o.label}
            </Mono>
          </Link>
        );
      })}
    </div>
  );
}
