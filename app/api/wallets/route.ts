/* Paginated wallets endpoint for the Load More button on /wallets.
 * Client appends new rows to its local state on each call. */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { clampOffset, getLeaderboard, type WalletSort } from '@/lib/queries';
import { WALLETS_PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = WALLETS_PAGE_SIZE;

function isSort(v: unknown): v is WalletSort {
  return v === 'pnl' || v === 'spend' || v === 'pulls';
}

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const sortRaw = searchParams.get('sort');
  const sort: WalletSort = isSort(sortRaw) ? sortRaw : 'pnl';
  const q = searchParams.get('q')?.trim() ?? '';
  const page = clampOffset(searchParams.get('page'), 1_000);

  const board = await getLeaderboard(sort, page, PAGE_SIZE, q || undefined);
  return NextResponse.json(board, { headers: { 'cache-control': 'no-store' } });
});
