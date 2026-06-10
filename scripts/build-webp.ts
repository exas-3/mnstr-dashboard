/* Offline WebP pre-bake.
 *
 * Encodes every card master (<slug>.jpg) into the proxy's WebP variant set
 * (<slug>@<width>.webp at CARD_IMG_WIDTHS) on this machine, so the Hetzner box
 * serves them ready-made instead of encoding on first hit.
 *
 * Workflow:
 *   rsync -az --include='*.jpg' --exclude='*' root@HOST:/var/cache/mnstr-cards/ ./webp-build/masters/
 *   npx tsx scripts/build-webp.ts          # (or: npm run build-webp)
 *   rsync -az ./webp-build/out/ root@HOST:/var/cache/mnstr-cards/
 *
 * Dirs overridable via WEBP_MASTERS_DIR / WEBP_OUT_DIR, concurrency via
 * WEBP_CONCURRENCY. Idempotent: skips variants that already exist, so re-runs
 * only encode newly-pulled masters.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { CARD_IMG_WIDTHS } from '../lib/img.js';
import { resizeWebp } from '../lib/cardVariant.js';

const MASTERS_DIR = process.env.WEBP_MASTERS_DIR ?? join(process.cwd(), 'webp-build', 'masters');
const OUT_DIR = process.env.WEBP_OUT_DIR ?? join(process.cwd(), 'webp-build', 'out');
const CONCURRENCY = Math.max(1, Number(process.env.WEBP_CONCURRENCY ?? 8));

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

interface Job { master: string; slug: string; width: number; out: string }

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  // Masters are `<slug>.jpg`; the cache dir also holds `<slug>@<w>.jpg/.webp`
  // variant files — exclude anything with an `@` so we never re-encode a variant.
  const masters = (await fs.readdir(MASTERS_DIR)).filter(f => f.endsWith('.jpg') && !f.includes('@'));
  console.log(`masters: ${masters.length}  widths: ${CARD_IMG_WIDTHS.join(',')}`);
  console.log(`  in:  ${MASTERS_DIR}`);
  console.log(`  out: ${OUT_DIR}`);

  const jobs: Job[] = [];
  for (const file of masters) {
    const slug = file.slice(0, -'.jpg'.length);
    for (const width of CARD_IMG_WIDTHS) {
      jobs.push({ master: join(MASTERS_DIR, file), slug, width, out: join(OUT_DIR, `${slug}@${width}.webp`) });
    }
  }

  const total = jobs.length;
  let cursor = 0, done = 0, encoded = 0, skipped = 0, failed = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        if (await fileExists(job.out)) {
          skipped++;
        } else {
          const master = await fs.readFile(job.master);
          await fs.writeFile(job.out, await resizeWebp(master, job.width));
          encoded++;
        }
      } catch (err) {
        failed++;
        console.warn(`[webp] failed ${job.slug}@${job.width}:`, (err as Error)?.message);
      }
      if (++done % 500 === 0 || done === total) {
        console.log(`  ${done}/${total}  (encoded ${encoded}, skipped ${skipped}, failed ${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`done. encoded ${encoded}, skipped ${skipped}, failed ${failed} of ${total}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => { console.error(err); process.exit(1); });
