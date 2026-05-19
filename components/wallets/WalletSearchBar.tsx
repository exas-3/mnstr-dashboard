'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mono } from '../primitives';
import { SearchIcon } from '../Icons';

export default function WalletSearchBar({ count }: { count: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);

  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  // Debounce URL updates so we don't thrash on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (q.trim()) next.set('q', q.trim());
      else next.delete('q');
      next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `/wallets?${qs}` : '/wallets');
    }, 200);
    return () => window.clearTimeout(id);
  }, [q, router, params]);

  return (
    <div
      className="mx-3 mt-3 flex items-center gap-2 px-3 py-2"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <SearchIcon />
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search handle or 0x…"
        className="flex-1 outline-none"
        style={{
          background: 'transparent',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--fg)',
        }}
      />
      <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>{count.toLocaleString('en-US')}</Mono>
    </div>
  );
}
