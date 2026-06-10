/* Image URL helpers — keep all card-image references going through the
 * Hetzner-cached proxy at /img/[slug] instead of cdn.mnstr.xyz directly.
 * First hit lazily downloads + caches; all subsequent hits are local.
 *
 * Pass a `width` to get a resized + WebP-negotiated variant (`/img/<slug>?w=`),
 * snapped to a small allowlist so the proxy only ever generates a bounded set
 * of cached variants. Callers request the width matching their display size
 * (≈2× DPR for the thumbnail, a larger one for the hover preview / hero). */

/** Allowed resize widths (px), one per display context (≈2× DPR target). */
export const CARD_IMG_WIDTHS = [120, 240, 480, 1200] as const;
export type CardImgWidth = (typeof CARD_IMG_WIDTHS)[number];

/** Snap an arbitrary width up to the nearest allowed variant (cap at largest). */
export function snapWidth(width: number): CardImgWidth {
  for (const w of CARD_IMG_WIDTHS) {
    if (width <= w) return w;
  }
  return CARD_IMG_WIDTHS[CARD_IMG_WIDTHS.length - 1];
}

/** Parse a raw `?w=` value to an allowed width, or null if absent/invalid. */
export function parseWidth(raw: string | null): CardImgWidth | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return snapWidth(n);
}

export function cardImageUrl(
  slug: string | null | undefined,
  cdnFallback?: string | null,
  width?: number,
): string | null {
  if (slug) return width ? `/img/${slug}?w=${snapWidth(width)}` : `/img/${slug}`;
  return cdnFallback ?? null;
}
