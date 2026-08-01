/* Paginated pull history for a single card — powers the "Show more"
 * button beneath the Pull history list on /cards/[slug]. */

import { NextResponse } from 'next/server';
import { apiHandler, badRequest, SLUG_RE } from '@/lib/api';
import { clampOffset, getCardPullHistory } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;

export const GET = apiHandler(async (
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return badRequest('invalid card slug');
  const { searchParams } = new URL(req.url);
  const offset = clampOffset(searchParams.get('offset'));
  const rows = await getCardPullHistory(slug, offset, PAGE_SIZE);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
});
