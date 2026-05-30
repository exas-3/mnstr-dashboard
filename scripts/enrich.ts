import { sql } from '../db/client.js';
import { config } from './config.js';
import { getPull, RateLimiter, type ApiPull } from './api.js';

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function upsertCard(api: ApiPull): Promise<string | null> {
  const c = api.card;
  if (!c?.slug) return null;
  const front = c.image ?? c.images?.find(i => i.position === 'front')?.url ?? null;
  const back = c.images?.find(i => i.position === 'back')?.url ?? null;
  await sql`
    INSERT INTO cards (
      slug, title, year, card_set, player, grading, grading_company,
      serial_number, category, image_front, image_back, list_price_usd, remote_id, updated_at
    ) VALUES (
      ${c.slug},
      ${c.title ?? null},
      ${c.year ?? null},
      ${c.set ?? null},
      ${c.player ?? null},
      ${c.grading ?? null},
      ${c.gradingCompany ?? null},
      ${c.serialNumber ?? null},
      ${c.category ?? null},
      ${front},
      ${back},
      ${c.listPriceUsd ?? null},
      ${c.remoteId ?? null},
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title           = COALESCE(EXCLUDED.title, cards.title),
      year            = COALESCE(EXCLUDED.year, cards.year),
      card_set        = COALESCE(EXCLUDED.card_set, cards.card_set),
      player          = COALESCE(EXCLUDED.player, cards.player),
      grading         = COALESCE(EXCLUDED.grading, cards.grading),
      grading_company = COALESCE(EXCLUDED.grading_company, cards.grading_company),
      serial_number   = COALESCE(EXCLUDED.serial_number, cards.serial_number),
      category        = COALESCE(EXCLUDED.category, cards.category),
      image_front     = COALESCE(EXCLUDED.image_front, cards.image_front),
      image_back      = COALESCE(EXCLUDED.image_back, cards.image_back),
      list_price_usd  = COALESCE(EXCLUDED.list_price_usd, cards.list_price_usd),
      remote_id       = COALESCE(EXCLUDED.remote_id, cards.remote_id),
      updated_at      = now()
  `;
  return c.slug;
}

export async function enrichOne(
  requestId: bigint,
  limiter?: RateLimiter,
): Promise<'ok' | 'no_card' | 'missing' | 'error'> {
  if (limiter) await limiter.take();
  try {
    const pull = await getPull(requestId);
    if (!pull) {
      // Mark as checked-but-missing so we don't re-poll forever.
      await sql`
        UPDATE pulls
        SET enriched_at = now(), status_checked_at = now()
        WHERE request_id = ${requestId.toString()}
      `;
      return 'missing';
    }
    const cardSlug = await upsertCard(pull);
    // /gacha/pulls/{id} returns only thin payload: priceUsd, createdAt, card{...}, user{...}.
    // It does NOT return per-pull status or payoutUsd. fmv comes from card.fmv.
    // Top-level fmvUsd/payoutUsd/status are populated only by the live /gacha/recent-pulls feed.
    const fmv = num(pull.fmvUsd) ?? (pull.card?.fmv ?? null);
    // Snapshot guard: refuse to set fmv_at_pull_usd to 0 / null. The fast-enrich
    // path can race ahead of mnstr's backend card assignment — when that happens,
    // pull.card.fmv comes back as 0 and we'd freeze a zero value forever. Treat
    // anything ≤ 0 as "not yet known" so a later restatus pass populates it.
    const fmvForSnapshot = fmv != null && fmv > 0 ? fmv : null;
    // fmv_usd = latest vault appraisal (overwritten every enrich, marks
    // holdings to market). fmv_at_pull_usd = frozen at first enrich — the
    // protocol's buyback commitment at pull time, used by paper P&L so it
    // doesn't drift retroactively when MnStr re-prices a card.
    await sql`
      UPDATE pulls SET
        fmv_usd           = ${fmv},
        fmv_at_pull_usd   = COALESCE(pulls.fmv_at_pull_usd, ${fmvForSnapshot}),
        payout_usd        = ${num(pull.payoutUsd)},
        status            = ${pull.status ?? null},
        card_slug         = ${cardSlug},
        username          = ${pull.user?.username ?? null},
        user_slug         = ${pull.user?.slug ?? null},
        referral_code     = ${pull.user?.referralCode ?? null},
        price_usd         = COALESCE(${num(pull.priceUsd)}, pulls.price_usd),
        enriched_at       = now(),
        status_checked_at = now()
      WHERE request_id = ${requestId.toString()}
    `;
    // Second SSE tick after the row is fully enriched — first tick (from
    // insert) had no title/image/username; this one does. Cheap to over-notify.
    sql.notify('pulls_tick', '').catch(() => {});
    // 'no_card' = the pull exists on the API but mnstr hasn't assigned its card
    // yet (fast-enrich raced ahead). Caller should retry shortly rather than
    // wait for the 24h restatus pass.
    return cardSlug ? 'ok' : 'no_card';
  } catch (e) {
    console.error(`enrich ${requestId} error:`, e instanceof Error ? e.message : e);
    return 'error';
  }
}

export async function enrichPending(limit = 5000): Promise<void> {
  const rows = await sql<{ request_id: string }[]>`
    SELECT request_id::text AS request_id
    FROM pulls
    WHERE enriched_at IS NULL
    ORDER BY block_number ASC
    LIMIT ${limit}
  `;
  if (rows.length === 0) {
    console.log('[enrich] nothing pending');
    return;
  }
  console.log(`[enrich] ${rows.length} pending`);

  const limiter = new RateLimiter(config.enrichRps);
  let ok = 0,
    miss = 0,
    err = 0;
  await runWithConcurrency(rows, config.enrichConcurrency, async row => {
    const r = await enrichOne(BigInt(row.request_id), limiter);
    if (r === 'ok' || r === 'no_card') ok++;
    else if (r === 'missing') miss++;
    else err++;
    if ((ok + miss + err) % 100 === 0) {
      console.log(`[enrich] progress ok=${ok} miss=${miss} err=${err}`);
    }
  });
  console.log(`[enrich] done ok=${ok} miss=${miss} err=${err}`);
}

/**
 * Backstop for the enrich↔card-assignment race. A pull's WS fast-enrich (and
 * any retries) can all land before mnstr assigns its card, leaving card_slug
 * NULL with enriched_at set — which excludes it from enrichPending, and
 * restatusHolding won't revisit it for restatusAgeHours (24h). So the newest
 * pulls show up in the Live feed with no title/image. This re-enriches still
 * card-less RECENT pulls every reconcile (ignoring the 24h gate) so they fill
 * in within one cycle once the card lands. Scoped to a short window so we don't
 * hammer the API for genuinely-never-assigned old pulls.
 */
export async function enrichRecentMissing(withinHours = 6, limit = 500): Promise<void> {
  const cutoff = new Date(Date.now() - withinHours * 3600 * 1000);
  const rows = await sql<{ request_id: string }[]>`
    SELECT request_id::text AS request_id
    FROM pulls
    WHERE card_slug IS NULL AND pulled_at >= ${cutoff}
    ORDER BY pulled_at DESC
    LIMIT ${limit}
  `;
  if (rows.length === 0) return;
  console.log(`[enrich-recent] re-checking ${rows.length} card-less pulls from last ${withinHours}h`);
  const limiter = new RateLimiter(config.enrichRps);
  let ok = 0, pending = 0, err = 0;
  await runWithConcurrency(rows, config.enrichConcurrency, async row => {
    const r = await enrichOne(BigInt(row.request_id), limiter);
    if (r === 'ok') ok++;
    else if (r === 'error') err++;
    else pending++; // no_card / missing — still no card on mnstr's side
  });
  console.log(`[enrich-recent] done resolved=${ok} still-pending=${pending} err=${err}`);
}

export async function restatusHolding(limit = 2000): Promise<void> {
  const cutoff = new Date(Date.now() - config.restatusAgeHours * 3600 * 1000);
  // Re-check anything where (a) status is still pending OR (b) the fast-enrich
  // raced and we got back an empty card payload (no slug or fmv=0). Once
  // mnstr's backend assigns the card, a later restatus picks it up.
  const rows = await sql<{ request_id: string }[]>`
    SELECT request_id::text AS request_id
    FROM pulls
    WHERE (
        status IS NULL
        OR status = ''
        OR status = 'holding'
        OR card_slug IS NULL
        OR fmv_at_pull_usd IS NULL
        OR fmv_at_pull_usd = 0
      )
      AND (status_checked_at IS NULL OR status_checked_at < ${cutoff})
    ORDER BY status_checked_at ASC NULLS FIRST
    LIMIT ${limit}
  `;
  if (rows.length === 0) {
    console.log('[restatus] nothing to re-check');
    return;
  }
  console.log(`[restatus] ${rows.length} holding pulls to re-check`);

  const limiter = new RateLimiter(config.enrichRps);
  let ok = 0,
    err = 0;
  await runWithConcurrency(rows, config.enrichConcurrency, async row => {
    const r = await enrichOne(BigInt(row.request_id), limiter);
    if (r === 'ok' || r === 'no_card' || r === 'missing') ok++;
    else err++;
  });
  console.log(`[restatus] done ok=${ok} err=${err}`);
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}
