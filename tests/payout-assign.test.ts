import { describe, expect, it } from 'vitest';
import {
  assignPayouts,
  PAYOUT_MAX_FORWARD,
  PAYOUT_SLACK_BACK,
  type PayoutSellback,
  type PayoutTransfer,
} from '../scripts/payout-assign.js';

const P = '0xplayer1';

function sb(requestId: string, block: number, player = P): PayoutSellback {
  return { requestId, player, block };
}
function tf(tx: string, block: number, amount: string, player = P): PayoutTransfer {
  return { player, block, tx, amount };
}

function byId(out: ReturnType<typeof assignPayouts>) {
  return new Map(out.map(a => [a.requestId, a]));
}

describe('assignPayouts', () => {
  it('assigns the earliest in-window transfer to each sellback', () => {
    const out = byId(assignPayouts(
      [sb('1', 100)],
      [tf('0xa', 101, '87.00')],
    ));
    expect(out.get('1')).toEqual({ requestId: '1', amount: '87.00', tx: '0xa' });
  });

  it('sibling sellbacks in one block consume DISTINCT transfers (the old nearest-block bug)', () => {
    // Two sellbacks at block 100; two payouts at 101 and 102. Nearest-block
    // matching gave both sellbacks the 101 transfer (double-count) and
    // orphaned 102 — the one-to-one walk must split them.
    const out = byId(assignPayouts(
      [sb('1', 100), sb('2', 100)],
      [tf('0xa', 101, '87.00'), tf('0xb', 102, '91.00')],
    ));
    expect(out.get('1')!.tx).toBe('0xa');
    expect(out.get('2')!.tx).toBe('0xb');
  });

  it('a missing payout does not steal a later card’s transfer past +MAX_FORWARD', () => {
    // Sellback 1 was never paid; its window ends at 100 + MAX_FORWARD. The
    // next payout (for sellback 2) is beyond that — sellback 1 must stay
    // unassigned, and sellback 2 must get its own transfer.
    const farBlock = 100 + PAYOUT_MAX_FORWARD + 50;
    const out = byId(assignPayouts(
      [sb('1', 100), sb('2', farBlock)],
      [tf('0xb', farBlock + 1, '91.00')],
    ));
    expect(out.get('1')).toEqual({ requestId: '1', amount: null, tx: null });
    expect(out.get('2')!.tx).toBe('0xb');
  });

  it('accepts a payout up to SLACK_BACK blocks before the event, but not earlier', () => {
    const inWindow = byId(assignPayouts(
      [sb('1', 100)],
      [tf('0xa', 100 - PAYOUT_SLACK_BACK, '87.00')],
    ));
    expect(inWindow.get('1')!.tx).toBe('0xa');

    const outOfWindow = byId(assignPayouts(
      [sb('1', 100)],
      [tf('0xa', 100 - PAYOUT_SLACK_BACK - 1, '87.00')],
    ));
    expect(outOfWindow.get('1')).toEqual({ requestId: '1', amount: null, tx: null });
  });

  it('never assigns one transfer twice even when windows overlap', () => {
    // Both sellbacks' windows contain the single transfer — only the first
    // (oldest) may take it.
    const out = byId(assignPayouts(
      [sb('1', 100), sb('2', 103)],
      [tf('0xa', 104, '87.00')],
    ));
    expect(out.get('1')!.tx).toBe('0xa');
    expect(out.get('2')).toEqual({ requestId: '2', amount: null, tx: null });
  });

  it('keeps players fully independent', () => {
    const out = byId(assignPayouts(
      [sb('1', 100, '0xalice'), sb('2', 100, '0xbob')],
      [tf('0xa', 101, '87.00', '0xbob')],
    ));
    expect(out.get('1')).toEqual({ requestId: '1', amount: null, tx: null });
    expect(out.get('2')!.tx).toBe('0xa');
  });

  it('is idempotent: re-running on the same inputs yields identical assignments', () => {
    const sellbacks = [sb('1', 100), sb('2', 100), sb('3', 500)];
    const transfers = [tf('0xa', 101, '87.00'), tf('0xb', 102, '91.00'), tf('0xc', 501, '10.00')];
    const first = assignPayouts(sellbacks, transfers);
    const second = assignPayouts(sellbacks, transfers);
    expect(second).toEqual(first);
  });

  it('handles unsorted input (stable-sorts by player/block internally)', () => {
    const out = byId(assignPayouts(
      [sb('2', 200), sb('1', 100)],
      [tf('0xb', 201, '91.00'), tf('0xa', 101, '87.00')],
    ));
    expect(out.get('1')!.tx).toBe('0xa');
    expect(out.get('2')!.tx).toBe('0xb');
  });
});
