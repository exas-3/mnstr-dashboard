'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_COOKIE, isTheme, type Theme } from '@/lib/theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute('data-theme');
  return isTheme(attr) ? attr : DEFAULT_THEME;
}

export default function ThemeToggle() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // Hydrate from the SSR-applied attribute on mount, so the toggle reflects
  // what the user actually sees.
  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  function flip() {
    const next: Theme = theme === 'foil' ? 'arcade' : 'foil';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_COOKIE, next);
    } catch {}
    // 1 year, lax — strict isn't needed for a UI preference
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // Force a server re-render so pages that dispatch on theme (Pulse, Live,
    // etc.) swap their layout — not just their CSS variables.
    router.refresh();
  }

  const label = theme === 'foil' ? 'arcade' : 'foil';
  const isArcade = theme === 'arcade';

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={`Switch to ${label} theme`}
      className="border-line text-fg-3 hover:text-fg hover:bg-bg-2 inline-flex h-7 items-center gap-1.5 border px-2 text-xs uppercase tracking-wide transition-colors"
      style={{ borderRadius: 'var(--radius)' }}
    >
      <span aria-hidden>{isArcade ? '▓' : '◆'}</span>
      <span className="mono">{label}</span>
    </button>
  );
}
