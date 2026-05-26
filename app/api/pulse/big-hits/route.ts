/* Paginated Big Hits feed (Pulse). Window-scoped, deduped by card, filtered
 * to FMV ≥ 2× pack price. */

import { NextResponse } from 'next/server';
import { getTopHitsDeduped, type TimeWindowKey } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 10;
const VALID: TimeWindowKey[] = ['24h', '7d', '30d', 'all'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const w = searchParams.get('w') ?? '24h';
  const window: TimeWindowKey = (VALID as string[]).includes(w) ? (w as TimeWindowKey) : '24h';
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const rows = await getTopHitsDeduped(window, PAGE_SIZE, offset);
  return NextResponse.json(
    { rows },
    { headers: { 'cache-control': 'no-store' } },
  );
}
