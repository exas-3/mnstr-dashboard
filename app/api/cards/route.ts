/* Paginated cards endpoint for the Load More button on /cards.
 * Mirrors the /api/wallets pattern. */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { clampOffset, getCardsList, type CardView } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 24;

function isView(v: unknown): v is CardView {
  return v === 'top' || v === 'most' || v === 'recent';
}
type Tier = 'all' | 'Starter' | 'Premium' | 'Ultra' | 'Adventure' | 'Great' | 'Outlaw';
function isTier(v: unknown): v is Tier {
  return v === 'all' || v === 'Starter' || v === 'Premium' || v === 'Ultra' || v === 'Adventure' || v === 'Great' || v === 'Outlaw';
}

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const view: CardView = isView(searchParams.get('view')) ? (searchParams.get('view') as CardView) : 'top';
  const tier: Tier = isTier(searchParams.get('tier')) ? (searchParams.get('tier') as Tier) : 'all';
  const q = searchParams.get('q')?.trim() ?? '';
  const page = clampOffset(searchParams.get('page'), 1_000);

  const list = await getCardsList({
    view,
    tier,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  return NextResponse.json(list, { headers: { 'cache-control': 'no-store' } });
});
