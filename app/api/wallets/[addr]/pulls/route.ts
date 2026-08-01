/* Paginated pull history for a single wallet — powers the "Show more"
 * button beneath the Recent pulls list on /wallets/[addr]. */

import { NextResponse } from 'next/server';
import { apiHandler, badRequest, ADDR_RE } from '@/lib/api';
import { clampOffset, getWalletRecentPulls } from '@/lib/queries';

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
  const rows = await getWalletRecentPulls(addr, offset, PAGE_SIZE);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
});
