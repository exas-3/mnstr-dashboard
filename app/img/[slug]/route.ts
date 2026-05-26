/* Card-image proxy with a local disk cache on Hetzner.
 *
 * First hit for a slug: query cards.image_front from Postgres, fetch the JPEG
 * from cdn.mnstr.xyz, write it to /var/cache/mnstr-cards/<slug>.jpg, stream
 * it back to the client.
 *
 * All subsequent hits: serve straight from disk with no DB query and no
 * outbound fetch — that's the whole point. immutable Cache-Control means
 * browsers + intermediate caches keep it forever.
 *
 * Override the cache dir via CARD_IMAGE_CACHE_DIR.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { sql } from '@/db/client';

const CACHE_DIR = process.env.CARD_IMAGE_CACHE_DIR ?? '/var/cache/mnstr-cards';
const SLUG_RE = /^[a-z0-9-]+$/;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function streamJpeg(buf: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      // 1 year immutable. If we ever need to invalidate (FMV image changed),
      // we'll bust by renaming the slug or adding a query string.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return new NextResponse('invalid slug', { status: 400 });
  }

  const cachePath = join(CACHE_DIR, `${slug}.jpg`);

  // Disk-cache fast path
  try {
    const buf = await fs.readFile(cachePath);
    return streamJpeg(buf);
  } catch {
    // miss — fall through to fetch
  }

  // Look up the canonical URL from cards
  const [row] = await sql<Array<{ image_front: string | null }>>`
    SELECT image_front FROM cards WHERE slug = ${slug} LIMIT 1
  `;
  if (!row?.image_front) {
    return new NextResponse('not found', { status: 404 });
  }

  // Fetch from upstream (cdn.mnstr.xyz)
  let upstreamBuf: Buffer;
  const upstreamUrl = row.image_front;
  try {
    const res = await fetch(upstreamUrl, { cache: 'no-store' });
    if (!res.ok) {
      // 4xx = permanently gone (mnstr deleted/replaced the asset). Clear the
      // stale URL from our DB so the next page render falls through to the
      // placeholder pattern instead of bouncing off the CDN every visit.
      // 5xx stays — could be transient on mnstr's side.
      if (res.status >= 400 && res.status < 500) {
        sql`UPDATE cards SET image_front = NULL WHERE slug = ${slug} AND image_front = ${upstreamUrl}`
          .then(() => console.warn(`[img] cleared stale image_front for ${slug} (CDN ${res.status})`))
          .catch(err => console.warn(`[img] failed to clear stale URL for ${slug}:`, err?.message));
      }
      return new NextResponse(`upstream ${res.status}`, { status: res.status === 404 ? 404 : 502 });
    }
    upstreamBuf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return new NextResponse('upstream failed', { status: 502 });
  }

  // Write to cache best-effort
  fs.mkdir(CACHE_DIR, { recursive: true })
    .then(() => fs.writeFile(cachePath, upstreamBuf))
    .catch(err => console.warn(`[img] cache write failed for ${slug}:`, err?.message));

  return streamJpeg(upstreamBuf);
}
