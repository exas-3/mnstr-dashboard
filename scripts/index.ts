import { sql } from '../db/client.js';
import { backfillAll } from './backfill.js';
import { backfillSellbacks } from './sellbacks.js';
import { backfillRedemptions } from './redemptions.js';
import { backfillMarketplace } from './marketplace.js';
import { enrichPending, restatusHolding, enrichRecentMissing } from './enrich.js';
import { refreshCardFmvs } from './fmv.js';
import { pollLoop, pollOnce } from './poll.js';
import { snapshotLeaderboard } from './leaderboard.js';
import { backfillUsdmFlows, auditUsdmDrift, linkSellbacksOnchain } from './usdm-flows.js';
import type { Tier } from './config.js';

function parseTier(arg?: string): Tier | undefined {
  if (!arg) return undefined;
  const t = arg[0].toUpperCase() + arg.slice(1).toLowerCase();
  if (t === 'Starter' || t === 'Premium' || t === 'Ultra' || t === 'Adventure') return t;
  throw new Error(`Unknown tier: ${arg} (expected Starter | Premium | Ultra | Adventure)`);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  try {
    switch (cmd) {
      case 'backfill': {
        const tier = parseTier(rest[0]);
        await backfillAll(tier);
        break;
      }
      case 'reindex': {
        const tier = parseTier(rest[0]);
        await backfillAll(tier, { fromDeploy: true });
        break;
      }
      case 'backfill-sellbacks': {
        const tier = parseTier(rest[0]);
        await backfillSellbacks(tier);
        break;
      }
      case 'reindex-sellbacks': {
        const tier = parseTier(rest[0]);
        await backfillSellbacks(tier, { fromDeploy: true });
        break;
      }
      case 'backfill-redemptions': {
        const tier = parseTier(rest[0]);
        await backfillRedemptions(tier);
        break;
      }
      case 'reindex-redemptions': {
        const tier = parseTier(rest[0]);
        await backfillRedemptions(tier, { fromDeploy: true });
        break;
      }
      case 'backfill-marketplace':
        await backfillMarketplace();
        break;
      case 'reindex-marketplace':
        await backfillMarketplace({ fromDeploy: true });
        break;
      case 'enrich': {
        const limit = rest[0] ? Number(rest[0]) : 5000;
        await enrichPending(limit);
        break;
      }
      case 'restatus': {
        const limit = rest[0] ? Number(rest[0]) : 2000;
        await restatusHolding(limit);
        break;
      }
      case 'enrich-recent': {
        const hours = rest[0] ? Number(rest[0]) : 6;
        await enrichRecentMissing(hours);
        break;
      }
      case 'refresh-fmvs':
        await refreshCardFmvs();
        break;
      case 'poll-once':
        await pollOnce();
        break;
      case 'poll':
        await pollLoop();
        break;
      case 'leaderboard':
        await snapshotLeaderboard();
        break;
      case 'backfill-usdm-flows':
        await backfillUsdmFlows();
        break;
      case 'reindex-usdm-flows':
        await backfillUsdmFlows({ fromBlock: 0 });
        break;
      case 'audit-usdm':
        await auditUsdmDrift(rest[0] ? Number(rest[0]) : 20);
        break;
      case 'link-sellbacks':
        await linkSellbacksOnchain();
        break;
      default:
        console.log(`Usage:
  cli backfill            [tier]   Fetch on-chain PlayAssigned events from last checkpoint
  cli reindex             [tier]   Re-fetch PlayAssigned from each contract's deploy block
  cli backfill-sellbacks  [tier]   Fetch NFTSoldBack events from last sellback checkpoint
  cli reindex-sellbacks   [tier]   Re-fetch NFTSoldBack from each contract's deploy block
  cli backfill-redemptions [tier]  Fetch NFTRedeemed events from last redemption checkpoint
  cli reindex-redemptions [tier]   Re-fetch NFTRedeemed from each contract's deploy block
  cli backfill-marketplace         Fetch CardMarketplace events from last checkpoint
  cli reindex-marketplace          Re-fetch CardMarketplace events from deploy block
  cli enrich              [limit=5000]   Fetch /gacha/pulls/{id} for pending pulls
  cli restatus            [limit=2000]   Re-poll 'holding' pulls (no-op: API doesn't return status)
  cli refresh-fmvs                Refresh every card's current FMV + log changes to card_fmv_snapshots
  cli poll-once                   backfill + sellbacks + marketplace + enrich, single pass
  cli poll                        Continuous loop (every POLL_INTERVAL_MS)
  cli leaderboard                 Snapshot /leaderboard into leaderboard_snapshots
  cli backfill-usdm-flows         Index USDm Transfer events involving the operator EOA
  cli reindex-usdm-flows          Re-scan USDm flows from block 0 (full reset)
  cli audit-usdm          [n=20]  Compare DB-derived P&L vs on-chain net per wallet
  cli link-sellbacks              Attribute each sellback to its on-chain USDm payout`);
        process.exit(1);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
