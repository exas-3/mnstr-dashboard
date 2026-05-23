'use client';

import { useEffect, useState } from 'react';

const POLL_MS = 5000;

export default function BlockCounter({ initial }: { initial: number | null }) {
  const [block, setBlock] = useState<number | null>(initial);
  const [lagSec, setLagSec] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        if (j.latestBlock?.block) setBlock(j.latestBlock.block);
        if (j.serverNow) {
          const lag = Math.max(0, Math.round((Date.now() - new Date(j.serverNow).getTime()) / 1000));
          setLagSec(lag);
        }
      } catch {}
    }
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (block == null) return null;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.1em',
        color: 'var(--fg-3)',
      }}
      title={lagSec != null ? `server lag ~${lagSec}s` : undefined}
    >
      BLOCK {block.toLocaleString('en-US')}
    </span>
  );
}
