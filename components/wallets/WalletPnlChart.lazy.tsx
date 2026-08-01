'use client';

/* Lazy entry for WalletPnlChart: Recharts is the heaviest client dep and the
 * chart is mounted-gated anyway (renders nothing until the DOM exists), so
 * splitting it into an async chunk removes Recharts from the page's initial
 * bundle at zero behavior cost. The loading box mirrors the chart's own
 * frame (outer card + toggle row + HEIGHT chart area) so nothing shifts. */

import dynamic from 'next/dynamic';

export default dynamic(() => import('./WalletPnlChart'), {
  ssr: false,
  loading: () => (
    <div
      className="mx-3 mt-2"
      style={{ height: 330, background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    />
  ),
});
