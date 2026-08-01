/* Paginated outliers feed for the "Show more" button on /tiers.
 * Returns distinct-card rows ordered by max FMV desc. */

import { NextResponse } from 'next/server';
import { apiHandler, badRequest } from '@/lib/api';
import { clampOffset, getTierOutliers } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;
const VALID_TIERS = new Set(['Starter', 'Premium', 'Ultra', 'Adventure', 'Great', 'Outlaw']);

export const GET = apiHandler(async (
  req: Request,
  { params }: { params: Promise<{ tier: string }> },
) => {
  const { tier } = await params;
  if (!VALID_TIERS.has(tier)) return badRequest('unknown tier');
  const { searchParams } = new URL(req.url);
  const offset = clampOffset(searchParams.get('offset'));
  const rows = await getTierOutliers(tier, PAGE_SIZE, offset);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
});
