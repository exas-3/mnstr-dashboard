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
  try {
    const res = await fetch(row.image_front, { cache: 'no-store' });
    if (!res.ok) {
      return new NextResponse(`upstream ${res.status}`, { status: 502 });
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
