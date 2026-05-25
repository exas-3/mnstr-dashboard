/* One-shot script: download every card image from cdn.mnstr.xyz into the
 * local cache dir read by /img/[slug]. Skips ones already on disk.
 *
 *   npx tsx scripts/cache-images.ts            # all missing
 *   npx tsx scripts/cache-images.ts --force    # re-download everything
 *
 * Run on Hetzner once after deploying the image proxy to warm the cache —
 * after that, the proxy auto-caches on first request for any new pulls.
 */

import 'dotenv/config';
import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import { sql } from '../db/client.js';

const CACHE_DIR = process.env.CARD_IMAGE_CACHE_DIR ?? '/var/cache/mnstr-cards';
const CONCURRENCY = Number(process.env.CACHE_IMAGES_CONCURRENCY ?? 8);

interface Row { slug: string; image_front: string | null }

async function downloadOne(row: Row, force: boolean): Promise<'ok' | 'skip' | 'err'> {
  if (!row.image_front) return 'skip';
  const dest = join(CACHE_DIR, `${row.slug}.jpg`);
  if (!force && existsSync(dest)) return 'skip';
  try {
    const res = await fetch(row.image_front, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${row.slug}`);
      return 'err';
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    return 'ok';
  } catch (e) {
    console.warn(`  fetch failed for ${row.slug}:`, e instanceof Error ? e.message : e);
    return 'err';
  }
}

async function runWithConcurrency<T>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<'ok' | 'skip' | 'err'>,
): Promise<{ ok: number; skip: number; err: number }> {
  let ok = 0, skip = 0, err = 0;
  let next = 0;
  const workers = Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      const r = await fn(items[i]);
      if (r === 'ok') ok++;
      else if (r === 'skip') skip++;
      else err++;
      if ((ok + err) % 100 === 0 && ok + err > 0) {
        console.log(`  progress: ok=${ok} skip=${skip} err=${err} (${ok + skip + err}/${items.length})`);
      }
    }
  });
  await Promise.all(workers);
  return { ok, skip, err };
}

async function main() {
  const force = process.argv.includes('--force');
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const rows = await sql<Row[]>`SELECT slug, image_front FROM cards WHERE image_front IS NOT NULL`;
  console.log(`[cache-images] ${rows.length} cards with images. force=${force} concurrency=${CONCURRENCY}`);
  console.log(`[cache-images] cache dir: ${CACHE_DIR}`);
  const t0 = Date.now();
  const stats = await runWithConcurrency(rows, CONCURRENCY, r => downloadOne(r, force));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[cache-images] done in ${elapsed}s — ok=${stats.ok} skip=${stats.skip} err=${stats.err}`);
  await sql.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
