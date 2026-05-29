# MnStr Watch — repo guide

Live, on-chain analytics for the **MnStr** card gacha (graded Pokémon TCG + One Piece slabs) on **MegaETH**. One repo = Next.js dashboard **+** the indexer. Production: **mnstr.watch**.

## Stack
- Next.js 16 (App Router, ISR via `export const revalidate`), React 19, Tailwind v4.
- `postgres` (postgres.js) — single client at `db/client.ts`. DB: `postgres://mnstr:mnstr_local@localhost:5432/mnstr`.
- Indexer = plain TS run with `tsx` under `scripts/` (entry `scripts/index.ts`).
- `sharp` for image generation (favicons/OG).

## Run locally
- Dashboard: `npm run dev` (port **3004**).
- Indexer loop: `npm run poller`. One-off CLI: `npm run cli <cmd>` (see `scripts/index.ts` for commands: backfill, enrich, restatus, refresh-fmvs, poll-once, …).
- Migrations: numbered `sql/NNN_*.sql`, applied in order with `psql -f` (`npm run db:migrate` runs all).

## Deploy (Hetzner, same box as offshore)
Host `root@178.105.127.121`, app at **`/opt/mnstr-dashboard`**, served by PM2 (`mnstr-dashboard` on :3010 behind nginx+TLS; `mnstr-poller` is the indexer). Recipe:
```
npm run build                       # build locally first — catch errors before shipping
rsync -az --delete \
  --exclude '.env' --exclude 'node_modules' --exclude '.next' \
  --exclude '.git' --exclude 'design' --exclude 'public/img-cache' \
  ./ root@178.105.127.121:/opt/mnstr-dashboard/
ssh root@178.105.127.121 'cd /opt/mnstr-dashboard && npm run build && pm2 reload mnstr-dashboard'
```
- The box rebuilds too (`.next` is excluded from rsync). Expect a few seconds of 502 during reload — it recovers.
- `.env` lives only on the box (not in rsync). `design/` is local-only (excluded) — put scratch/marketing assets there.
- For indexer/script changes also `pm2 restart mnstr-poller`. Migrations: rsync the `sql/` file, then `psql ... -f sql/NNN_*.sql` on the box.

## Indexing (Alchemy-only)
- WS listener (`scripts/ws.ts`, eth_subscribe) is realtime; `scripts/poll.ts` is a 5-min reconcile via Alchemy `eth_getLogs`. Keys in `.env`.
- **Do not fail over to the MegaETH RPC** — Alchemy only (user's call). Alchemy quota is account-wide + monthly; when hit it returns plaintext "Monthly capacity limit exceeded" and the poller silently stalls (pm2 "online" but every call errors).
- `mainnet.megaeth.com/rpc` = mainnet (chainId 4326). `carrot.megaeth.com` = **testnet** (6343) — never index against it.

## Domain gotchas (these cause real bugs)
- **Buyback rate is per-tier, NOT a flat 0.85:** Starter 0.87 / Monster(Premium) 0.91 / Ultra 0.95 / Adventure 0.90. "85%" is marketing floor. Encoded in `sql/006` + the `pulls_enriched` view.
- **Two FMVs per pull:** `fmv_at_pull_usd` = frozen at first enrich (use for "FMV at last pull", paper P&L, big-hit banner); `fmv_usd` = current, overwritten on every enrich + hourly by `scripts/fmv.ts` (logs to `card_fmv_snapshots`). They diverge — pick deliberately.
- **P&L model:** `usdm_flows` (operator-routed USDm in/out, the realized ground truth) → `wallet_pnl` view. `total_net = realized_net + held_fmv + mp_held_fmv` (raw FMV, not buyback). Marketplace cash is already counted (buyers pay the operator EOA); marketplace is custodial (protocol sells its own vault inventory — no player-seller payout).
- **Pooled claims:** `cards.slug ↔ serial_number` is 1:1 but many pulls share one slug; serial-level ownership is NOT recoverable from chain.
- **Sellback → payout** is a separate operator→player `USDm.transfer` tx, ~1 block after the NFTSoldBack event (one transfer per card; the NFTSoldBack log carries no amount). `linkSellbacksOnchain()` does a **per-player one-to-one greedy assignment** (oldest sellback → earliest unused transfer in `[block−5, block+1000]`), consuming each transfer once — a nearest-block match double-counted siblings and orphaned the rest (~13% off the realized-payout total). Result stored in `sellbacks.onchain_amount_usd` + `payout_tx_hash`; unmatched rows fall back to `fmv_at_pull × tier_rate` in the view. Re-run with `npm run cli link-sellbacks` (full recompute, idempotent).
- `pulls_enriched` is the workhorse view (status holding/sold_back/redeemed + payout + payout_tx_hash).

## Conventions
- **`CREATE OR REPLACE VIEW` can't reorder/drop columns** — only append new ones at the end. Keep existing column order when editing a view migration.
- Client-rendered timestamps use `<LocalTime>` / `useLocalFormatter` (`components/LocalTime.tsx`) with a mounted-gate to avoid React hydration mismatches — don't format dates inline in client components.
- Single **Foil** theme only (Arcade was removed). Colors are CSS vars (`--bg`, `--accent`, …) in `app/globals.css`.
- Explorer links: `https://mega.etherscan.io/tx/{hash}`.
- Don't commit or push unless asked. Default to deploy-on-request.
