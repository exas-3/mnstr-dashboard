import { sql } from '@/db/client';

/* Held-inventory FMV over time for one wallet (localhost-only chart).
 *
 * The wallet's vault value = Σ FMV of cards it currently holds. It rises when a
 * card enters the vault (a pull, or a marketplace buy), falls when one leaves
 * (a sell-back to the protocol, or — rarely — the marketplace re-sells that
 * serial to someone else), and re-prices whenever the hourly FMV poll updates a
 * held slug's value (card_fmv_snapshots).
 *
 * We model it as a time-ordered event walk over add / remove / revalue events,
 * maintaining a per-slug held count and FMV, so the running total is exact.
 * Revalue events come from two streams: the hourly FMV snapshots (since
 * 2026-05-28) AND the FMV every pull of that slug froze (fmv_at_pull_usd, any
 * wallet) — the latter re-prices held cards across the whole history, including
 * before snapshots existed. Each held card of a slug shares that slug's latest
 * FMV. The series ends at "now" revalued to the live FMV (so it matches the
 * page's Held·FMV) when cards are still held, else at the last sell. Only cards
 * held ≥1h count — a sub-1h flip was never really "held". */

export interface HeldFmvPoint {
  ts: number;   // epoch ms
  held: number; // Σ FMV of cards held at this instant, USD
  n: number;    // number of cards held
}

type Ev = { t: number; kind: 'add' | 'rm' | 'rev'; slug: string; v: number };

export async function getWalletHeldFmvSeries(wallet: string): Promise<HeldFmvPoint[]> {
  const addr = wallet.toLowerCase();

  // 1. Pulled cards that entered the vault. holding = held to now; sold_back =
  //    held [pulled_at, sold_at). init_fmv values it before any snapshot.
  const pulls = await sql<Array<{ card_slug: string; pulled_at: string; sold_at: string | null; init_fmv: string; cur_fmv: string }>>`
    SELECT card_slug,
           pulled_at::text,
           sold_at::text,
           COALESCE(fmv_at_pull_usd, fmv_usd, 0)::text AS init_fmv,
           COALESCE(fmv_usd, 0)::text                  AS cur_fmv
    FROM pulls_enriched
    WHERE wallet = ${addr} AND card_slug IS NOT NULL
      AND (status = 'holding'
           OR (status = 'sold_back' AND sold_at IS NOT NULL
               AND sold_at >= pulled_at + interval '1 hour'))`;

  // 2. Marketplace buys. Held from bought_at until the serial is bought by
  //    someone else (the "latest buyer owns it" rule), else to now. FMV per
  //    slug = MAX(pull fmv_usd), same basis the rest of the app uses.
  const buys = await sql<Array<{ card_slug: string; bought_at: string; resold_at: string | null; cur_fmv: string }>>`
    SELECT c.slug AS card_slug,
           ms.bought_at::text,
           (SELECT MIN(ms2.bought_at) FROM marketplace_sales ms2
              WHERE ms2.serial_number = ms.serial_number AND ms2.bought_at > ms.bought_at)::text AS resold_at,
           COALESCE((SELECT MAX(p.fmv_usd) FROM pulls p WHERE p.card_slug = c.slug), 0)::text       AS cur_fmv
    FROM marketplace_sales ms
    JOIN cards c ON c.serial_number = ms.serial_number
    WHERE ms.buyer = ${addr}`;

  if (pulls.length === 0 && buys.length === 0) return [];

  const slugs = [...new Set([...pulls.map(p => p.card_slug), ...buys.map(b => b.card_slug)])];

  // 3a. Hourly FMV snapshots for the involved slugs (re-pricing, since 2026-05-28).
  const snaps = slugs.length === 0 ? [] : await sql<Array<{ card_slug: string; observed_at: string; fmv_usd: string }>>`
    SELECT card_slug, observed_at::text, fmv_usd::text
    FROM card_fmv_snapshots
    WHERE card_slug = ANY(${slugs})
    ORDER BY observed_at`;

  // 3b. Every pull of an involved slug (any wallet) froze the card's FMV at that
  //     moment (fmv_at_pull_usd), so the pull history re-prices held cards too —
  //     crucially BEFORE snapshots existed. Collapsed to change-points to keep
  //     it light.
  const pullObs = slugs.length === 0 ? [] : await sql<Array<{ card_slug: string; observed_at: string; fmv_usd: string }>>`
    SELECT card_slug, pulled_at::text AS observed_at, fmv_at_pull_usd::text AS fmv_usd
    FROM (
      SELECT card_slug, pulled_at, fmv_at_pull_usd,
             lag(fmv_at_pull_usd) OVER (PARTITION BY card_slug ORDER BY pulled_at) AS prev
      FROM pulls
      WHERE card_slug = ANY(${slugs}) AND fmv_at_pull_usd IS NOT NULL
    ) z
    WHERE prev IS DISTINCT FROM fmv_at_pull_usd
    ORDER BY pulled_at`;

  // Live FMV per slug, for the final revaluation to "now".
  const curFmv = new Map<string, number>();
  for (const p of pulls) curFmv.set(p.card_slug, Number(p.cur_fmv));
  for (const b of buys) if (!curFmv.has(b.card_slug)) curFmv.set(b.card_slug, Number(b.cur_fmv));

  const evs: Ev[] = [];
  let firstAdd = Infinity;
  for (const p of pulls) {
    const t = Date.parse(p.pulled_at);
    evs.push({ t, kind: 'add', slug: p.card_slug, v: Number(p.init_fmv) });
    if (t < firstAdd) firstAdd = t;
    if (p.sold_at) evs.push({ t: Date.parse(p.sold_at), kind: 'rm', slug: p.card_slug, v: 0 });
  }
  for (const b of buys) {
    const t = Date.parse(b.bought_at);
    const resold = b.resold_at ? Date.parse(b.resold_at) : null;
    if (resold !== null && resold - t < 3_600_000) continue; // held < 1h — not "held"
    evs.push({ t, kind: 'add', slug: b.card_slug, v: Number(b.cur_fmv) });
    if (t < firstAdd) firstAdd = t;
    if (resold !== null) evs.push({ t: resold, kind: 'rm', slug: b.card_slug, v: 0 });
  }
  for (const s of [...snaps, ...pullObs]) evs.push({ t: Date.parse(s.observed_at), kind: 'rev', slug: s.card_slug, v: Number(s.fmv_usd) });

  // At equal timestamps: revalue first (so add/rm use the fresh FMV), then
  // removes, then adds.
  const order = { rev: 0, rm: 1, add: 2 };
  evs.sort((a, b) => a.t - b.t || order[a.kind] - order[b.kind]);

  const count = new Map<string, number>();
  const fmv = new Map<string, number>();
  let held = 0;
  const out: HeldFmvPoint[] = [{ ts: firstAdd, held: 0, n: 0 }]; // start at 0 at the first pull

  const totalN = () => { let n = 0; for (const c of count.values()) n += c; return n; };

  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    if (e.t < firstAdd) continue; // ignore snapshots before any card was held
    if (e.kind === 'add') {
      if (!fmv.has(e.slug)) fmv.set(e.slug, e.v);
      count.set(e.slug, (count.get(e.slug) ?? 0) + 1);
      held += fmv.get(e.slug)!;
    } else if (e.kind === 'rm') {
      const c = count.get(e.slug) ?? 0;
      if (c > 0) { held -= fmv.get(e.slug) ?? 0; count.set(e.slug, c - 1); }
    } else {
      const cur = fmv.get(e.slug);
      if (cur === undefined) { fmv.set(e.slug, e.v); }
      else { held += (count.get(e.slug) ?? 0) * (e.v - cur); fmv.set(e.slug, e.v); }
    }
    // Coalesce same-timestamp events into one emitted point.
    if (i === evs.length - 1 || evs[i + 1].t !== e.t) {
      out.push({ ts: e.t, held: Math.round(held * 100) / 100, n: totalN() });
    }
  }

  // End the series: revalue to the live FMV and extend to "now" while cards are
  // still held; otherwise stop at the last sell (the vault is empty, so drop the
  // trailing held=0 points that later FMV snapshots would otherwise emit).
  if (totalN() > 0) {
    let final = 0;
    for (const [slug, c] of count) if (c > 0) final += c * (curFmv.get(slug) ?? fmv.get(slug) ?? 0);
    out.push({ ts: Date.now(), held: Math.round(final * 100) / 100, n: totalN() });
  } else {
    let lastLeave = -Infinity;
    for (const e of evs) if (e.kind === 'rm' && e.t > lastLeave) lastLeave = e.t;
    while (out.length > 1 && out[out.length - 1].ts > lastLeave) out.pop();
  }

  return downsample(out, 600);
}

// Time-bucket to ~target points (keep the last value per bucket + first/last),
// so heavy wallets stay light to render. The series is a step function, so the
// last value in a bucket is the representative one.
function downsample(pts: HeldFmvPoint[], target: number): HeldFmvPoint[] {
  if (pts.length <= target) return pts;
  const first = pts[0].ts;
  const span = (pts[pts.length - 1].ts - first) || 1;
  const bucket = span / target;
  const res: HeldFmvPoint[] = [];
  let lastB = -1;
  for (const p of pts) {
    const b = Math.floor((p.ts - first) / bucket);
    if (b !== lastB) { res.push(p); lastB = b; } else { res[res.length - 1] = p; }
  }
  if (res[res.length - 1].ts !== pts[pts.length - 1].ts) res.push(pts[pts.length - 1]);
  return res;
}
