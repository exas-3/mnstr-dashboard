/* Card-image proxy with a local disk cache on Hetzner.
 *
 * Master: the first hit for a slug looks up cards.image_front, fetches the
 * original JPEG from cdn.mnstr.xyz, and caches it at <CACHE_DIR>/<slug>.jpg.
 * A bare /img/<slug> (no ?w=) streams that original back unchanged — preserves
 * OG / external embeds.
 *
 * Variants: /img/<slug>?w=<N> derives a display-sized image from the master
 * with sharp — WebP when the client's Accept header allows it (essentially all
 * browsers), else a re-encoded JPEG. Each (slug, width, format) is cached on
 * disk and served immutably, so we resize/encode at most once per variant.
 * `?w=` is snapped to a small allowlist (lib/img) so variants stay bounded.
 *
 * Override the cache dir via CARD_IMAGE_CACHE_DIR.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { sql } from '@/db/client';
import { parseWidth } from '@/lib/img';
import { resizeWebp } from '@/lib/cardVariant';

const CACHE_DIR = process.env.CARD_IMAGE_CACHE_DIR ?? '/var/cache/mnstr-cards';
const SLUG_RE = /^[a-z0-9-]+$/;
const ONE_YEAR = 31536000;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function imageResponse(buf: Buffer, contentType: string, vary = false): NextResponse {
  const headers: Record<string, string> = {
    'content-type': contentType,
    'cache-control': `public, max-age=${ONE_YEAR}, immutable`,
  };
  // Variants are negotiated on Accept (same URL → webp or jpeg), so caches must
  // key on it. The bare original is always jpeg and needs no Vary.
  if (vary) headers['vary'] = 'Accept';
  return new NextResponse(new Uint8Array(buf), { status: 200, headers });
}

async function readCache(path: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path);
  } catch {
    return null;
  }
}

function writeCacheBestEffort(path: string, buf: Buffer): void {
  fs.mkdir(CACHE_DIR, { recursive: true })
    .then(() => fs.writeFile(path, buf))
    .catch(err => console.warn(`[img] cache write failed for ${path}:`, err?.message));
}

/* In-flight coalescing: an SSE tick makes every connected client refetch the
 * feed at once, so a new card's image arrives as a burst of identical
 * requests. Without coalescing each one independently hit the CDN (master)
 * and sharp (variant). Concurrent misses now await one shared promise per
 * key; results are plain data (never a shared Response object — a Response
 * body can only be consumed once). */
type ImgResult =
  | { buf: Buffer; contentType: string; vary: boolean }
  | { errStatus: number; errBody: string };

const masterInflight = new Map<string, Promise<Buffer | { errStatus: number; errBody: string }>>();
const variantInflight = new Map<string, Promise<ImgResult>>();

/* Fetch + cache the master original: DB lookup → cdn.mnstr.xyz. */
async function fetchMaster(slug: string): Promise<Buffer | { errStatus: number; errBody: string }> {
  const masterPath = join(CACHE_DIR, `${slug}.jpg`);
  const [row] = await sql<Array<{ image_front: string | null }>>`
    SELECT image_front FROM cards WHERE slug = ${slug} LIMIT 1
  `;
  if (!row?.image_front) return { errStatus: 404, errBody: 'not found' };

  const upstreamUrl = row.image_front;
  let buf: Buffer;
  try {
    const res = await fetch(upstreamUrl, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      // 4xx = permanently gone (mnstr deleted/replaced the asset). Clear the
      // stale URL so the next render falls through to the placeholder pattern
      // instead of bouncing off the CDN every visit. 5xx may be transient.
      if (res.status >= 400 && res.status < 500) {
        sql`UPDATE cards SET image_front = NULL WHERE slug = ${slug} AND image_front = ${upstreamUrl}`
          .then(() => console.warn(`[img] cleared stale image_front for ${slug} (CDN ${res.status})`))
          .catch(err => console.warn(`[img] failed to clear stale URL for ${slug}:`, err?.message));
      }
      return { errStatus: res.status === 404 ? 404 : 502, errBody: `upstream ${res.status}` };
    }
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    return { errStatus: 502, errBody: 'upstream failed' };
  }

  writeCacheBestEffort(masterPath, buf);
  return buf;
}

/* Acquire the master original: disk cache → coalesced fetch.
 * Returns the buffer, or a NextResponse to return verbatim (404 / 502). */
async function getMaster(slug: string): Promise<Buffer | NextResponse> {
  const masterPath = join(CACHE_DIR, `${slug}.jpg`);
  const cached = await readCache(masterPath);
  if (cached) return cached;

  let p = masterInflight.get(slug);
  if (!p) {
    p = fetchMaster(slug).finally(() => masterInflight.delete(slug));
    masterInflight.set(slug, p);
  }
  const r = await p;
  return Buffer.isBuffer(r) ? r : new NextResponse(r.errBody, { status: r.errStatus });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return new NextResponse('invalid slug', { status: 400 });
  }

  const width = parseWidth(new URL(req.url).searchParams.get('w'));

  // Bare /img/<slug> — original JPEG, unchanged behavior.
  if (width === null) {
    const master = await getMaster(slug);
    if (master instanceof NextResponse) return master;
    return imageResponse(master, 'image/jpeg');
  }

  // Resized variant — negotiate WebP vs JPEG from Accept.
  const wantsWebp = (req.headers.get('accept') ?? '').includes('image/webp');
  const ext = wantsWebp ? 'webp' : 'jpg';
  const contentType = wantsWebp ? 'image/webp' : 'image/jpeg';
  const variantPath = join(CACHE_DIR, `${slug}@${width}.${ext}`);

  const cachedVariant = await readCache(variantPath);
  if (cachedVariant) return imageResponse(cachedVariant, contentType, true);

  const variantKey = `${slug}@${width}.${ext}`;
  let vp = variantInflight.get(variantKey);
  if (!vp) {
    vp = produceVariant(slug, width, wantsWebp, contentType, variantPath).finally(() =>
      variantInflight.delete(variantKey),
    );
    variantInflight.set(variantKey, vp);
  }
  const r = await vp;
  if ('errStatus' in r) return new NextResponse(r.errBody, { status: r.errStatus });
  return imageResponse(r.buf, r.contentType, r.vary);
}

async function produceVariant(
  slug: string,
  width: number,
  wantsWebp: boolean,
  contentType: string,
  variantPath: string,
): Promise<ImgResult> {
  const master = await getMaster(slug);
  if (master instanceof NextResponse) {
    return { errStatus: master.status, errBody: await master.text().catch(() => '') };
  }

  let out: Buffer;
  try {
    out = wantsWebp
      ? await resizeWebp(master, width)
      : await sharp(master).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  } catch (err) {
    // sharp couldn't decode/encode — fall back to the original bytes.
    console.warn(`[img] resize failed for ${slug}@${width}:`, (err as Error)?.message);
    return { buf: master, contentType: 'image/jpeg', vary: false };
  }

  writeCacheBestEffort(variantPath, out);
  return { buf: out, contentType, vary: true };
}
