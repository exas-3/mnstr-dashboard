import Link from 'next/link';
import { Mono } from './primitives';

export default function LoadMore({
  remaining,
  href,
}: {
  remaining: number;
  href: string;
}) {
  if (remaining <= 0) return null;
  return (
    <div className="px-4 pt-5 pb-2 text-center">
      <Link
        href={href}
        className="inline-block"
        style={{
          padding: '10px 18px',
          color: 'var(--accent)',
          border: '1px solid color-mix(in oklch, var(--accent) 33%, transparent)',
          background: 'color-mix(in oklch, var(--accent) 5%, transparent)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.14em',
        }}
      >
        LOAD MORE · {remaining.toLocaleString('en-US')} LEFT
      </Link>
    </div>
  );
}
