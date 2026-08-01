'use client';

/* Lazy entry for HeldFmvChart — see WalletPnlChart.lazy.tsx for rationale. */

import dynamic from 'next/dynamic';

export default dynamic(() => import('./HeldFmvChart'), {
  ssr: false,
  loading: () => (
    <div
      className="mx-3 mt-2"
      style={{ height: 296, background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    />
  ),
});
