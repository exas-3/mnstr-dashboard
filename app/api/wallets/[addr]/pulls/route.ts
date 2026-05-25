/* Paginated pull history for a single wallet — powers the "Show more"
 * button beneath the Recent pulls list on /wallets/[addr]. */

import { NextResponse } from 'next/server';
import { getWalletRecentPulls } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;
  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const rows = await getWalletRecentPulls(addr, offset, PAGE_SIZE);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
}
