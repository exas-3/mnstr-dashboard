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

export async function enrichOne(requestId: bigint, limiter?: RateLimiter): Promise<'ok' | 'missing' | 'error'> {
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
    await sql`
      UPDATE pulls SET
        fmv_usd           = ${fmv},
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
    return 'ok';
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
    if (r === 'ok') ok++;
    else if (r === 'missing') miss++;
    else err++;
    if ((ok + miss + err) % 100 === 0) {
      console.log(`[enrich] progress ok=${ok} miss=${miss} err=${err}`);
    }
  });
  console.log(`[enrich] done ok=${ok} miss=${miss} err=${err}`);
}

export async function restatusHolding(limit = 2000): Promise<void> {
  const cutoff = new Date(Date.now() - config.restatusAgeHours * 3600 * 1000);
  const rows = await sql<{ request_id: string }[]>`
    SELECT request_id::text AS request_id
    FROM pulls
    WHERE (status IS NULL OR status = 'holding')
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
    if (r === 'ok' || r === 'missing') ok++;
    else err++;
  });
  console.log(`[restatus] done ok=${ok} err=${err}`);
}

async function runWithConcurrency<T>(
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
