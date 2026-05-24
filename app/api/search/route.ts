/* Cross-entity search for the top-bar SearchOverlay.
 *
 * Hits the existing wallet + card filter helpers in parallel and returns
 * up to N results per entity. The overlay debounces on the client; this
 * route itself is `no-store` so each keystroke gets fresh data. */

import { NextResponse } from 'next/server';
import { getLeaderboard, getCardsList } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PER_KIND = 6;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json(
      { q, wallets: [], cards: [] },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  const [board, list] = await Promise.all([
    getLeaderboard('pnl', 0, PER_KIND, q).catch(() => ({ rows: [], total: 0 })),
    getCardsList({ view: 'top', tier: 'all', q, page: 0, pageSize: PER_KIND }).catch(() => ({
      rows: [],
      total: 0,
    })),
  ]);

  return NextResponse.json(
    {
      q,
      wallets: board.rows.map(r => ({
        wallet: r.wallet,
        handle: r.handle,
        net: r.net,
        spend: r.spend,
        pulls: r.pulls,
      })),
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
}
