import { NextResponse, type NextRequest } from 'next/server';

/* Hard-block search-engine indexing whenever the site is accessed via any host
 * other than the canonical `mnstr.watch` (or www.mnstr.watch). This catches:
 *
 *   - Direct IP hits like 178.105.127.121:3010 (the current production deploy)
 *   - localhost during dev
 *   - Any staging/preview domains we haven't whitelisted
 *
 * Once DNS flips `mnstr.watch` → Hetzner, requests start arriving with the
 * canonical host and the header is no longer set — no code or env change
 * needed at cutover time. Override the canonical host via NEXT_PUBLIC_SITE_URL
 * if it ever changes (e.g. moving to a different domain). */

const CANONICAL_HOST = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return 'mnstr.watch';
  }
})();

const ALLOWED_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase() ?? '';
  // Strip any port suffix before matching (e.g. mnstr.watch:443 → mnstr.watch).
  const hostNoPort = host.split(':')[0];

  if (ALLOWED_HOSTS.has(host) || ALLOWED_HOSTS.has(hostNoPort)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res;
}

// Skip the middleware for Next internals + static assets so we don't burn
// cycles annotating images, fonts, etc. that bots won't index anyway.
export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data).*)'],
};
