/* Paginated wallets endpoint for the Load More button on /wallets.
 * Client appends new rows to its local state on each call. */

import { NextResponse } from 'next/server';
import { getLeaderboard, type WalletSort } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 25;

function isSort(v: unknown): v is WalletSort {
  return v === 'pnl' || v === 'spend' || v === 'pulls';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sortRaw = searchParams.get('sort');
  const sort: WalletSort = isSort(sortRaw) ? sortRaw : 'pnl';
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);

  const board = await getLeaderboard(sort, page, PAGE_SIZE, q || undefined);
  return NextResponse.json(board, { headers: { 'cache-control': 'no-store' } });
}
