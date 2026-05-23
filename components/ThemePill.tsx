'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_COOKIE, isTheme, type Theme } from '@/lib/theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute('data-theme');
  return isTheme(attr) ? attr : DEFAULT_THEME;
}

export default function ThemePill() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  function setTo(next: Theme) {
    if (next === theme) return;
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_COOKIE, next);
    } catch {}
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  const segments: Array<{ key: Theme; label: string }> = [
    { key: 'foil', label: 'FOIL' },
    { key: 'arcade', label: 'ARCADE' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Theme"
      className="inline-flex"
      style={{
        border: '1px solid var(--line-soft)',
        background: 'var(--bg-2)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {segments.map((s, i) => {
        const on = s.key === theme;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setTo(s.key)}
            style={{
              all: 'unset',
              cursor: on ? 'default' : 'pointer',
              padding: '4px 9px',
              fontSize: 9.5,
              letterSpacing: '0.14em',
              color: on ? 'var(--accent)' : 'var(--fg-3)',
              background: on ? 'var(--bg-3)' : 'transparent',
              borderLeft: i === 0 ? 'none' : '1px solid var(--line-soft)',
              transition: 'color 120ms, background 120ms',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
