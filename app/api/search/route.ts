/* Cross-entity search for the top-bar SearchOverlay.
 *
 * Wallets go through searchWallets — a purpose-built lightweight query (no
 * spark UNION, no pulls_enriched joins, 10s in-process TTL); the previous
 * getLeaderboard path recomputed the full ~1s board aggregation per
 * keystroke on a public endpoint. The overlay debounces on the client. */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { searchWallets, getCardsList } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PER_KIND = 6;
// Overlong strings are never real searches — trim before they hit LIKE.
const MAX_Q = 100;

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, MAX_Q);

  if (!q || q.length < 2) {
    return NextResponse.json(
      { q, wallets: [], cards: [] },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  // Errors propagate as a 500 rather than masquerading as an empty result
  // set — a DB outage should not render as "no matches".
  const [wallets, list] = await Promise.all([
    searchWallets(q, PER_KIND),
    getCardsList({ view: 'top', tier: 'all', q, page: 0, pageSize: PER_KIND }),
  ]);

  return NextResponse.json(
    {
      q,
      wallets,
      cards: list.rows.map(c => ({
        slug: c.slug,
        title: c.title,
        card_set: c.card_set,
        grading: c.grading,
        image_front: c.image_front,
        fmv: c.fmv,
        pulls: c.pulls,
      })),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
});
