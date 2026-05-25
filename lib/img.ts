/* Image URL helpers — keep all card-image references going through the
 * Hetzner-cached proxy at /img/[slug] instead of cdn.mnstr.xyz directly.
 * First hit lazily downloads + caches; all subsequent hits are local. */

export function cardImageUrl(
  slug: string | null | undefined,
  cdnFallback?: string | null,
): string | null {
  if (slug) return `/img/${slug}`;
  return cdnFallback ?? null;
}
