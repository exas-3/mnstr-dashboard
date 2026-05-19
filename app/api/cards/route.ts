/* Paginated cards endpoint for the Load More button on /cards.
 * Mirrors the /api/wallets pattern. */

import { NextResponse } from 'next/server';
import { getCardsList, type CardView } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 24;

function isView(v: unknown): v is CardView {
  return v === 'top' || v === 'most' || v === 'recent';
}
type Tier = 'all' | 'Starter' | 'Premium' | 'Ultra';
function isTier(v: unknown): v is Tier {
  return v === 'all' || v === 'Starter' || v === 'Premium' || v === 'Ultra';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view: CardView = isView(searchParams.get('view')) ? (searchParams.get('view') as CardView) : 'top';
  const tier: Tier = isTier(searchParams.get('tier')) ? (searchParams.get('tier') as Tier) : 'all';
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);

  const list = await getCardsList({
    view,
    tier,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  return NextResponse.json(list, { headers: { 'cache-control': 'no-store' } });
}
