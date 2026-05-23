/* One-shot favicon + OG image generator.
 *
 * Reads /public/mnstr-watch.svg + /public/mascot.svg, rasterises:
 *   favicon-32.png    32x32   (PNG fallback for old browsers)
 *   favicon-192.png   192x192 (PWA)
 *   favicon-512.png   512x512 (PWA)
 *   apple-touch-icon.png 180x180
 *   og-default.png    1200x630 (Open Graph card)
 *
 * Run with:  npx tsx scripts/build-favicons.ts
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PUBLIC = join(process.cwd(), 'public');
const WATCH_SVG = readFileSync(join(PUBLIC, 'mnstr-watch.svg'));
const MASCOT_SVG = readFileSync(join(PUBLIC, 'mascot.svg'));

async function makeFavicon(size: number, out: string) {
  // The watch SVG has aspect 240:280 (taller than wide). Fit it into a `size×size`
  // square: width <= size, height <= size. We constrain by height so the watch
  // dominates the favicon canvas.
  const watchH = size;
  const watchW = Math.round(size * 240 / 280);
  const watch = await sharp(WATCH_SVG, { density: 600 })
    .resize(watchW, watchH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Mascot is wide pixel-art (~2.2:1). Render full SVG, centered horizontally
  // and vertically at 53% of the watch height so it sits in the dial recess.
  const mascotW = Math.max(1, Math.round(watchW * 0.6));
  const mascotMeta = await sharp(MASCOT_SVG, { density: 600 })
    .resize(mascotW, undefined, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const mascot = mascotMeta.data;
  const mascotH = mascotMeta.info.height;

  const watchLeft = Math.round((size - watchW) / 2);
  const mascotLeft = Math.max(0, watchLeft + Math.round(watchW / 2 - mascotW / 2));
  const mascotTop = Math.max(0, Math.round(watchH * 0.53 - mascotH / 2));

  const finalSquare = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: watch, top: 0, left: watchLeft },
      { input: mascot, top: mascotTop, left: mascotLeft },
    ])
    .png()
    .toBuffer();

  writeFileSync(join(PUBLIC, out), finalSquare);
  console.log(`✓ wrote ${out} (${size}×${size})`);
}

async function makeOg() {
  const W = 1200;
  const H = 630;
  const watchSize = 280;
  const watchH = Math.round(watchSize * 280 / 240);

  const watch = await sharp(WATCH_SVG, { density: 600 })
    .resize(watchSize, watchH)
    .png()
    .toBuffer();
  const mascotW = Math.round(watchSize * 0.6);
  const mascotMeta = await sharp(MASCOT_SVG, { density: 600 })
    .resize(mascotW, undefined, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const mascot = mascotMeta.data;
  const mascotH = mascotMeta.info.height;

  const watchLeft = Math.round(W / 2 - watchSize / 2);
  const watchTop = Math.round(H / 2 - watchH / 2) - 30;
  const mascotLeft = watchLeft + Math.round(watchSize / 2 - mascotW / 2);
  const mascotTop = watchTop + Math.round(watchH * 0.53 - mascotH / 2);

  // Wordmark + tagline below the watch — render via SVG text overlay.
  const captionSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${W / 2}" y="${watchTop + watchH + 80}" font-family="Georgia, 'Times New Roman', serif"
        font-size="68" fill="#d6a04a" text-anchor="middle" font-weight="700">Mn$tr · Watch</text>
      <text x="${W / 2}" y="${watchTop + watchH + 130}" font-family="ui-monospace, monospace"
        font-size="22" fill="#a59683" text-anchor="middle" letter-spacing="3">A TREASURY OF MONSTERS</text>
    </svg>
  `);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 26, g: 24, b: 18, alpha: 1 },
    },
  })
    .composite([
      { input: watch, top: watchTop, left: watchLeft },
      { input: mascot, top: mascotTop, left: mascotLeft },
      { input: captionSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(join(PUBLIC, 'og-default.png'));
  console.log('✓ wrote og-default.png (1200×630)');
}

async function main() {
  await makeFavicon(32, 'favicon-32.png');
  await makeFavicon(192, 'favicon-192.png');
  await makeFavicon(512, 'favicon-512.png');
  await makeFavicon(180, 'apple-touch-icon.png');
  await makeOg();
  console.log('done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
