# MnStr Watch — repo guide

Live, on-chain analytics for the **MnStr** card gacha (graded Pokémon TCG + One Piece slabs) on **MegaETH**. One repo = Next.js dashboard **+** the indexer. Production: **mnstr.watch**.

## Stack
- Next.js 16 (App Router, ISR via `export const revalidate`), React 19, Tailwind v4.
- `postgres` (postgres.js) — single client at `db/client.ts`. DB: `postgres://mnstr:mnstr_local@localhost:5432/mnstr`.
- Indexer = plain TS run with `tsx` under `scripts/` (entry `scripts/index.ts`).
- `sharp` for image generation (favicons/OG). Charts use **Recharts** (client-only, mounted-gated).

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
- **No real marketplace seller.** The protocol sells from its own vault, so there's no on-chain player-seller. Card/wallet/marketplace activity render the seller as **"MnStr vault"** (NULL `seller_wallet`) — do NOT re-introduce the old "most-recent prior puller" inference (with pooled claims it mislabeled the last puller of a slug as the seller of every later sale; there's no `sale_sell` side for wallets). `mp_held_fmv` credits the latest buyer as current owner; `in_vault` (card page) is true if any pull is `holding` OR the serial was sold on the marketplace.
- **Redemption is off-chain — the `'redeemed'` path is effectively dead.** `NFTRedeemed` (`0x14c9b4d4…`) has NEVER fired on-chain (0 from-deploy on all gacha contracts AND 0 in a global all-contract scan); cards aren't NFTs, physical shipment is an off-chain MnStr action with no chain footprint, and the public API doesn't expose it. So a pull only ever shows `holding` or `sold_back`, the `redemptions` table stays empty, and "redeemed vs still-holding" is not determinable (both mean the wallet owns the asset at FMV, so `total_net` is unaffected). The scan is left in place in case mnstr starts emitting it.
- **Wallet P&L chart** (`getWalletPnlSeries` + `components/wallets/WalletPnlChart.tsx`): cumulative **portfolio net = realized cash (`usdm_flows`) + FMV of cards held**, rebuilt as ONE merged event per pull (`fmv−price`) / sellback (`payout−fmv`, booked at the payout-settlement tx so the legs don't split into a spurious spike) / marketplace buy, plus naked operator cash (deposits/withdrawals not tied to a pull/sellback/buy) split out — so it converges to the headline `wallet_pnl.total_net`. Recharts LINE (split green/loss at $0) or OHLC CANDLES; TIME or PULLS&SELLS axis; candles re-aggregate to ~40 buckets on zoom (wheel/drag/±). The leaderboard P&L sparks use the same series.
- **Sellback → payout** is a separate operator→player `USDm.transfer` tx, ~1 block after the NFTSoldBack event (one transfer per card; the NFTSoldBack log carries no amount). `linkSellbacksOnchain()` does a **per-player one-to-one greedy assignment** (oldest sellback → earliest unused transfer in `[block−5, block+1000]`), consuming each transfer once — a nearest-block match double-counted siblings and orphaned the rest (~13% off the realized-payout total). Result stored in `sellbacks.onchain_amount_usd` + `payout_tx_hash`; unmatched rows fall back to `fmv_at_pull × tier_rate` in the view. Re-run with `npm run cli link-sellbacks` (full recompute, idempotent).
- `pulls_enriched` is the workhorse view (status holding/sold_back/redeemed + payout + payout_tx_hash).

## Conventions
- **`CREATE OR REPLACE VIEW` can't reorder/drop columns** — only append new ones at the end. Keep existing column order when editing a view migration.
- Client-rendered timestamps use `<LocalTime>` / `useLocalFormatter` (`components/LocalTime.tsx`) with a mounted-gate to avoid React hydration mismatches — don't format dates inline in client components.
- **SVG `<title>` must take a single string child** (`<title>{`${a}: ${b}`}</title>`), not adjacent `{a}: {b}` expressions — adjacent dynamic text nodes inside `<title>` hydrate-mismatch (the browser merges the text).
- **Enrich↔card-assignment race:** the on-chain `PlayAssigned` carries no card; the card slug/FMV/user come from the MnStr API (`/gacha/pulls/{playId}`), which mnstr populates a few seconds after the pull. The WS fast-enrich fires ~5s out and retries on a backoff; `pollOnce` also runs `enrichRecentMissing()` (re-enriches card-less pulls from the last 6h every cycle) so the newest pulls fill within minutes instead of waiting `restatusAgeHours` (24h). A pull can therefore appear card-less briefly; ~90 old pulls are permanently card-less (mnstr never assigned one).
- Single **Foil** theme only (Arcade was removed). Colors are CSS vars (`--bg`, `--accent`, …) in `app/globals.css`.
- Explorer links: `https://mega.etherscan.io/tx/{hash}`.
- Don't commit or push unless asked. Default to deploy-on-request.
