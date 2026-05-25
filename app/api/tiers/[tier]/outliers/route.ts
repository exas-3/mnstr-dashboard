/* Paginated outliers feed for the "Show more" button on /tiers.
 * Returns distinct-card rows ordered by max FMV desc. */

import { NextResponse } from 'next/server';
import { getTierOutliers } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;
const VALID_TIERS = new Set(['Starter', 'Premium', 'Ultra', 'Adventure']);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tier: string }> },
) {
  const { tier } = await params;
  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ rows: [] }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const rows = await getTierOutliers(tier, PAGE_SIZE, offset);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
}
