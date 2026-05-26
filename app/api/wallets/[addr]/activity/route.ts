/* Paginated wallet activity feed — wallet's pulls + marketplace trades
 * where wallet was buyer or seller. Powers "Show more" on Recent history. */

import { NextResponse } from 'next/server';
import { getWalletActivity } from '@/lib/queries';

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
  const rows = await getWalletActivity(addr, offset, PAGE_SIZE);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
}
