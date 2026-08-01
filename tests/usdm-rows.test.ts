import { describe, expect, it } from 'vitest';
import { toRows } from '../scripts/usdm-flows.js';
import { OPERATOR_EOA, MARKETPLACE_ADDRESS, GACHA_CONTRACTS } from '../scripts/config.js';
import type { UsdmFlowLog } from '../scripts/chain.js';

/* Direction / counterparty classification feeds usdm_flows — the realized-P&L
 * ground truth (wallet_pnl sums it directly). A flipped direction or a leaked
 * internal shuffle silently corrupts every headline number. */

const PLAYER = '0x1111111111111111111111111111111111111111';
const OPERATOR = OPERATOR_EOA.toLowerCase();

function log(from: string, to: string, amountWei: bigint): UsdmFlowLog {
  return {
    blockNumber: 17_000_000,
    txHash: '0xtx',
    logIndex: 0,
    timestamp: 1_756_480_160,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    amountWei,
  };
}

describe('toRows (usdm_flows classification)', () => {
  it('operator → player is a player IN with the wei→USD conversion', () => {
    const [row] = toRows([log(OPERATOR, PLAYER, 87_500000000000000000n)]);
    expect(row.wallet).toBe(PLAYER);
    expect(row.direction).toBe('in');
    expect(row.amount_usd).toBe('87.500000');
    expect(row.counterparty).toBe('operator');
  });

  it('player → operator is a player OUT', () => {
    const [row] = toRows([log(PLAYER, OPERATOR, 50_000000000000000000n)]);
    expect(row.wallet).toBe(PLAYER);
    expect(row.direction).toBe('out');
    expect(row.amount_usd).toBe('50.000000');
  });

  it('classifies gacha-contract counterparties by tier', () => {
    const starter = GACHA_CONTRACTS.find(c => c.tier === 'Starter')!;
    const [row] = toRows([log(PLAYER, starter.address, 50_000000000000000000n)]);
    expect(row.direction).toBe('out');
    expect(row.counterparty).toBe('gacha_starter');
  });

  it('skips mnstr-internal shuffles (operator ↔ marketplace)', () => {
    expect(toRows([log(OPERATOR, MARKETPLACE_ADDRESS, 1_000000000000000000n)])).toHaveLength(0);
  });

  it('skips transfers with no mnstr side', () => {
    const other = '0x2222222222222222222222222222222222222222';
    expect(toRows([log(PLAYER, other, 1_000000000000000000n)])).toHaveLength(0);
  });
});
