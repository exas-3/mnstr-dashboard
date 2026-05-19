export type Theme = 'foil' | 'arcade';

export const THEME_COOKIE = 'mnstr-theme';
export const DEFAULT_THEME: Theme = 'foil';

export function isTheme(v: unknown): v is Theme {
  return v === 'foil' || v === 'arcade';
}
