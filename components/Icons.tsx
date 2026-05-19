/* SVG glyphs ported from screens.jsx + app-features.jsx. */

export function NavGlyph({ name, active }: { name: 'pulse' | 'tiers' | 'wallets' | 'cards' | 'live'; active?: boolean }) {
  const c = active ? 'var(--accent)' : 'var(--fg-3)';
  const sw = 1.4;
  const inner = {
    pulse: (
      <polyline
        points="3,12 7,12 10,7 13,16 16,10 21,10"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    tiers: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="16" y2="12" />
        <line x1="4" y1="17" x2="12" y2="17" />
      </g>
    ),
    wallets: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="7" width="16" height="11" rx="1.5" />
        <path d="M4 10 L14 5 L20 7" />
        <circle cx="16" cy="13" r="1.2" fill={c} />
      </g>
    ),
    cards: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
        <rect x="7" y="4" width="11" height="15" rx="1" />
        <rect
          x="3"
          y="7"
          width="11"
          height="15"
          rx="1"
          fill={active ? 'color-mix(in oklch, var(--accent) 13%, transparent)' : 'transparent'}
        />
      </g>
    ),
    live: (
      <g>
        <circle cx="12" cy="12" r="3" fill={c} />
        <circle cx="12" cy="12" r="6.5" fill="none" stroke={c} strokeWidth={sw} opacity="0.55" />
        <circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth={sw} opacity="0.25" />
      </g>
    ),
  }[name];
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {inner}
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" stroke="var(--fg-2)" strokeWidth="1.6" />
      <line x1="15" y1="15" x2="20" y2="20" stroke="var(--fg-2)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--fg-2)" strokeWidth="1.4" />
      <line x1="12" y1="11" x2="12" y2="17" stroke="var(--fg-2)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="var(--fg-2)" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18 L9 12 L15 6"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
