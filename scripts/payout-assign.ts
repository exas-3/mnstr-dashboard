/* Pure core of the sellback→payout linker (scripts/usdm-flows.ts).
 *
 * Extracted so the money-critical assignment logic is unit-testable without a
 * database: the previous nearest-block heuristic was ~13% off the realized-
 * payout total (sibling sellbacks double-counted one transfer while orphaning
 * the rest), and the window constants + consume-once invariant here are
 * load-bearing. See linkSellbacksOnchain for the on-chain context.
 */

// A payout transfer can land a few blocks BEFORE its NFTSoldBack event
// (observed min delta −5) and typically lands ~1 block after (observed max
// +203). MAX_FORWARD bounds how far ahead we'll reach so a missing payout
// can't make a sellback steal the next card's (much later) payout.
export const PAYOUT_SLACK_BACK = 5;
export const PAYOUT_MAX_FORWARD = 1000;

export interface PayoutSellback {
  requestId: string;
  player: string;
  block: number;
}

export interface PayoutTransfer {
  player: string;
  block: number;
  tx: string;
  amount: string;
}

export interface PayoutAssignment {
  requestId: string;
  amount: string | null;
  tx: string | null;
}

/* Greedy one-to-one assignment: walk each player's sellbacks oldest-first and
 * take the earliest not-yet-used USDm-in transfer inside
 * [block − PAYOUT_SLACK_BACK, block + PAYOUT_MAX_FORWARD], consuming each
 * transfer at most once. Sellbacks with no transfer in window get null
 * (the pulls_enriched view then falls back to fmv_at_pull × tier_rate).
 *
 * Inputs are stably re-sorted by (player, block) here, so same-block ties
 * keep the caller's relative order (the DB caller orders by log_index). */
export function assignPayouts(
  sellbacks: PayoutSellback[],
  transfers: PayoutTransfer[],
): PayoutAssignment[] {
  const sbs = [...sellbacks].sort(
    (a, b) => (a.player < b.player ? -1 : a.player > b.player ? 1 : a.block - b.block),
  );
  const tfs = [...transfers].sort(
    (a, b) => (a.player < b.player ? -1 : a.player > b.player ? 1 : a.block - b.block),
  );

  // Bucket payout transfers by player, preserving block/insertion order.
  const byPlayer = new Map<string, PayoutTransfer[]>();
  for (const f of tfs) {
    let arr = byPlayer.get(f.player);
    if (!arr) { arr = []; byPlayer.set(f.player, arr); }
    arr.push(f);
  }

  const out: PayoutAssignment[] = [];
  let curPlayer = '';
  let queue: PayoutTransfer[] = [];
  let ti = 0;
  for (const sb of sbs) {
    if (sb.player !== curPlayer) {
      curPlayer = sb.player;
      queue = byPlayer.get(curPlayer) ?? [];
      ti = 0;
    }
    // A transfer before this sellback's window can't belong to it — nor to any
    // later sellback (those have higher blocks) — so skip it permanently.
    while (ti < queue.length && queue[ti].block < sb.block - PAYOUT_SLACK_BACK) ti++;
    if (ti < queue.length && queue[ti].block <= sb.block + PAYOUT_MAX_FORWARD) {
      out.push({ requestId: sb.requestId, amount: queue[ti].amount, tx: queue[ti].tx });
      ti++;
    } else {
      out.push({ requestId: sb.requestId, amount: null, tx: null });
    }
  }
  return out;
}
