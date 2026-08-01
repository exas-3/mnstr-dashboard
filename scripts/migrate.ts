/* Tracked migration runner — replaces the old `for f in sql/*.sql; do psql -f`
 * loop, which re-ran every file on every invocation (any UPDATE without a
 * re-run guard silently rewrote data — sql/018 once reverted sellback payouts
 * to a superseded matching) and ignored per-file failures.
 *
 * Semantics:
 *   - schema_migrations records applied filenames; each file runs at most once.
 *   - Files apply in filename order, each inside its own transaction; the
 *     first failure rolls back that file and aborts the run (ON_ERROR_STOP).
 *   - Baseline auto-detect: on a DB that predates this runner (no
 *     schema_migrations but `pulls` exists — i.e. prod/dev boxes migrated by
 *     the old loop), all current files are recorded as applied WITHOUT being
 *     run. A fresh empty DB runs everything.
 *
 * Usage: npm run db:migrate   (tsx scripts/migrate.ts)
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from '../db/client.js';

const SQL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');

async function tableExists(name: string): Promise<boolean> {
  const [row] = await sql<Array<{ ok: boolean }>>`
    SELECT to_regclass(${'public.' + name}) IS NOT NULL AS ok
  `;
  return row?.ok ?? false;
}

// Everything up to and including this file was applied by the old untracked
// `psql -f` loop on every pre-runner DB (prod, dev snapshots). The baseline
// records ONLY these as already-applied; anything later runs normally. A
// blanket baseline would silently mark new migrations (022+) as applied on
// exactly the DBs that still need them — prod on deploy day, or a restored
// prod dump locally.
const BASELINE_THROUGH = '021';

export async function migrate(): Promise<void> {
  const files = readdirSync(SQL_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const hadTracking = await tableExists('schema_migrations');
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  if (!hadTracking && (await tableExists('pulls'))) {
    // Pre-existing DB migrated by the old untracked loop — baseline the
    // pre-runner files, then fall through so newer ones apply normally.
    const base = files.filter(f => f.slice(0, 3) <= BASELINE_THROUGH);
    for (const f of base) {
      await sql`INSERT INTO schema_migrations (filename) VALUES (${f}) ON CONFLICT DO NOTHING`;
    }
    console.log(
      `[migrate] baseline: existing schema detected — recorded ${base.length} pre-runner migration(s) (≤ ${BASELINE_THROUGH}) as applied without running them`,
    );
  }

  const applied = new Set(
    (await sql<Array<{ filename: string }>>`SELECT filename FROM schema_migrations`).map(r => r.filename),
  );

  const pending = files.filter(f => !applied.has(f));
  if (pending.length === 0) {
    console.log(`[migrate] up to date (${files.length} applied)`);
    return;
  }

  for (const f of pending) {
    const path = join(SQL_DIR, f);
    try {
      await sql.begin(async tx => {
        await tx.file(path);
        await tx`INSERT INTO schema_migrations (filename) VALUES (${f})`;
      });
      console.log(`[migrate] applied ${f}`);
    } catch (e) {
      console.error(`[migrate] FAILED ${f} (rolled back, run aborted):`, e instanceof Error ? e.message : e);
      process.exitCode = 1;
      return;
    }
  }
  console.log(`[migrate] done — ${pending.length} new migration(s) applied`);
}

migrate().finally(() => sql.end());
