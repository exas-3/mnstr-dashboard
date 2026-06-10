import sharp from 'sharp';

/* Shared card-image variant encoder.
 *
 * Used by BOTH the /img/[slug] proxy (on-demand encode for cards not yet
 * pre-baked) and scripts/build-webp.ts (offline batch pre-bake). Keeping a
 * single definition guarantees the pre-baked files are produced with the same
 * params the proxy would use, so the corpus stays consistent and the proxy
 * serves the baked files straight from its disk fast-path.
 *
 * Server-only (imports sharp) — never import this from a client component. */

export const WEBP_QUALITY = 78;

export function resizeWebp(master: Buffer, width: number): Promise<Buffer> {
  return sharp(master)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
