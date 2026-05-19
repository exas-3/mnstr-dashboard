'use client';

import { useEffect } from 'react';

const ITEMS: Array<{ label: string; body: string }> = [
  {
    label: 'MnStr FMV',
    body:
      'A vault appraisal set by MnStr, not a market consensus. We label every figure that depends on it as "MnStr FMV". It can move without an on-chain event.',
  },
  {
    label: 'Cards are not NFTs',
    body:
      'Cards are physical PSA-graded slabs in MnStr\'s vault, identified on-chain by a string `certNumber`. There is no ERC-721/1155 token. The chain stores a receipt + playId.',
  },
  {
    label: 'Status volatility',
    body:
      'A pull\'s status (holding vs sold_back) can change as players cash out. Holding figures show a "last polled" timestamp.',
  },
  {
    label: 'Pack odds',
    body:
      'We do not derive or display per-pack odds. Tier-level claims live on mnstr.xyz/packs.',
  },
  {
    label: 'P&L formula',
    body:
      'Net P&L = realised payouts (sold-back × 0.85·FMV) minus USDm spent on packs. Cards still held are tracked separately under "paper".',
  },
  {
    label: 'House edge',
    body:
      'House edge = (revenue − payouts) / revenue, on resolved (sold-back) pulls. Edge on still-held inventory is a paper figure.',
  },
];

export default function CaveatSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div
        className="border-line bg-bg-2 fixed bottom-0 inset-x-0 mx-auto max-w-2xl border-t p-5 sm:bottom-auto sm:top-12 sm:rounded-t-none sm:border"
        style={{ borderRadius: 'var(--radius)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Methodology</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg mono text-xs">
            esc
          </button>
        </div>
        <dl className="mt-4 space-y-3">
          {ITEMS.map(item => (
            <div key={item.label} className="border-line-soft border-t pt-3 first:border-t-0 first:pt-0">
              <dt className="mono text-fg-2 text-[11px] uppercase tracking-widest">{item.label}</dt>
              <dd className="text-fg-2 mt-1 text-sm leading-relaxed">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
