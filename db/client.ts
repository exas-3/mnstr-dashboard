import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgres://mnstr:mnstr_local@localhost:5432/mnstr';

declare global {
  // eslint-disable-next-line no-var
  var __mnstr_sql: ReturnType<typeof postgres> | undefined;
}

// Reuse a single connection pool across hot reloads in dev. In the indexer
// scripts (non-Next.js) the global lives for the process lifetime, which is
// also what we want.
export const sql = globalThis.__mnstr_sql ?? postgres(url, {
  max: 8,
  idle_timeout: 30,
  // Fail fast when Postgres is unreachable instead of hanging the request.
  connect_timeout: 10,
  // Server-side ceiling so one runaway query can't pin a pool slot forever.
  // Generous enough for the heavy leaderboard/backfill aggregations; long
  // maintenance runs can `SET LOCAL statement_timeout` per-transaction.
  connection: { statement_timeout: 30_000 },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mnstr_sql = sql;
}

export async function getState(key: string): Promise<string | null> {
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM indexer_state WHERE key = ${key}
  `;
  return rows[0]?.value ?? null;
}

export async function setState(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO indexer_state (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
