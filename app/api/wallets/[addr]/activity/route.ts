/* Paginated wallet activity feed — wallet's pulls + marketplace trades
 * where wallet was buyer or seller. Powers "Show more" on Recent history. */

import { NextResponse } from 'next/server';
import { apiHandler, badRequest, ADDR_RE } from '@/lib/api';
import { clampOffset, getWalletActivity } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;

export const GET = apiHandler(async (
  req: Request,
  { params }: { params: Promise<{ addr: string }> },
) => {
  const { addr } = await params;
  if (!ADDR_RE.test(addr)) return badRequest('invalid wallet address');
  const { searchParams } = new URL(req.url);
  const offset = clampOffset(searchParams.get('offset'));
  const rows = await getWalletActivity(addr, offset, PAGE_SIZE);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
});
