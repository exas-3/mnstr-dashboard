/* Server-side theme detection. Pages call this in their server component to
 * decide which variant tree to render (Foil vs Arcade). The CSS variables in
 * globals.css handle the per-token color/font switching; this only governs
 * layout-level structural differences. */

import { cookies } from 'next/headers';
import { DEFAULT_THEME, THEME_COOKIE, isTheme, type Theme } from './theme';

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const raw = store.get(THEME_COOKIE)?.value;
  return isTheme(raw) ? raw : DEFAULT_THEME;
}
