'use client';

import { useEffect, useState } from 'react';
import { Mono } from './primitives';

export interface BigHit {
  ago: string;          // "14S AGO"
  title: string;
  who: string;          // username or short addr
  tier: string;
  fmv: string;          // formatted USD without $
  href?: string;        // route to /cards/[slug]
  imageUrl?: string | null;
}

export default function BigHitBanner({
  pull,
  onTap,
  onDismiss,
}: {
  pull: BigHit;
  onTap?: () => void;
  onDismiss?: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1100);
    return () => clearInterval(id);
  }, []);
  const flash = tick % 2 === 0;
  return (
    <div
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      className="mx-3 mt-3"
      style={{
        position: 'relative',
        border: `1px solid ${flash ? 'var(--accent)' : 'color-mix(in oklch, var(--accent) 53%, transparent)'}`,
        background: 'linear-gradient(90deg, color-mix(in oklch, var(--accent) 10%, transparent), transparent 70%), var(--bg-2)',
        boxShadow: flash
          ? '0 0 0 1px color-mix(in oklch, var(--accent) 40%, transparent), 0 0 28px color-mix(in oklch, var(--accent) 20%, transparent)'
          : '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent)',
        transition: 'box-shadow 300ms, border-color 300ms',
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto',
        gap: 12,
        padding: 10,
        alignItems: 'center',
        cursor: onTap ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          aspectRatio: '5/7',
          background: pull.imageUrl
            ? `center/contain no-repeat url("${pull.imageUrl}")`
            : 'radial-gradient(circle at 30% 20%, color-mix(in oklch, var(--accent) 27%, transparent), transparent 55%), repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
          border: '1px solid color-mix(in oklch, var(--accent) 53%, transparent)',
        }}
      />
      <div className="min-w-0">
        <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.18em' }}>
          ★ BIG HIT · {pull.ago}
        </Mono>
        <div
          className="truncate"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--fg)',
            marginTop: 4,
          }}
        >
          {pull.title}
        </div>
        <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2, display: 'block' }}>
          {pull.who} · {pull.tier}
        </Mono>
      </div>
      <div className="text-right">
        <Mono style={{ fontSize: 17, color: 'var(--accent)', display: 'block' }}>${pull.fmv}</Mono>
        {onDismiss && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDismiss();
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              marginTop: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-4)',
              letterSpacing: '0.1em',
            }}
          >
            DISMISS
          </button>
        )}
      </div>
    </div>
  );
}
