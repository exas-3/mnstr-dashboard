'use client';

import type { PremiumMode } from '@/lib/buyback';

/* Small segmented toggle for switching the marketplace-row premium reference
 * between BUYBACK (what the protocol would have paid the seller) and FMV
 * (current vault appraisal). Default is buyback — that's the more meaningful
 * comparison for "did the player get a better deal selling on marketplace?". */
export default function PremiumModeToggle({
  mode,
  onChange,
}: {
  mode: PremiumMode;
  onChange: (m: PremiumMode) => void;
}) {
  const options: Array<{ key: PremiumMode; label: string }> = [
    { key: 'buyback', label: 'BUYBACK' },
    { key: 'fmv',     label: 'FMV' },
  ];
  return (
    <div className="mx-3 mt-2 mb-2 flex items-center justify-end gap-2">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-4)',
          letterSpacing: '0.14em',
        }}
      >
        SALE PREMIUM vs
      </span>
      <div
        role="tablist"
        className="inline-flex"
        style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}
      >
        {options.map((o, i) => {
          const on = o.key === mode;
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.key)}
              style={{
                all: 'unset',
                cursor: on ? 'default' : 'pointer',
                padding: '3px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: on ? 'var(--accent)' : 'var(--fg-3)',
                background: on ? 'var(--bg-3)' : 'transparent',
                borderLeft: i === 0 ? 'none' : '1px solid var(--line-soft)',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
