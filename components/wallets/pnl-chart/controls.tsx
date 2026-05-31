/* Two-option segmented control, matching the design system. */
export function Seg({ value, options, onChange }: {
  value: string;
  options: Array<{ k: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div role="tablist" className="inline-flex" style={{ border: '1px solid var(--line-soft)', background: 'var(--bg)' }}>
      {options.map((o, idx) => {
        const on = o.k === value;
        return (
          <button
            key={o.k}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.k)}
            style={{
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
              background: on ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
              borderRight: idx < options.length - 1 ? '1px solid var(--line-soft)' : 'none',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Compact icon button for the candle zoom controls (＋ / − / ⟲). */
export function ZoomBtn({ label, onClick, title, disabled }: { label: string; onClick: () => void; title?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 22, height: 18, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1,
        color: disabled ? 'var(--fg-4)' : 'var(--fg-2)', background: 'var(--bg)',
        border: '1px solid var(--line-soft)', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
