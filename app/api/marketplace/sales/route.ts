/* Paginated marketplace-sales feed — powers the "Show more" on /marketplace. */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { clampOffset, getMarketplaceSales } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 20;

// Same whitelist as the /marketplace tier chips — anything else = unfiltered.
const TIERS = new Set(['Starter', 'Great', 'Premium', 'Ultra', 'Adventure', 'Outlaw']);

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const offset = clampOffset(searchParams.get('offset'));
  const rawTier = searchParams.get('tier');
  const tier = rawTier && TIERS.has(rawTier) ? rawTier : null;
  const rows = await getMarketplaceSales(offset, PAGE_SIZE, tier);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
});
