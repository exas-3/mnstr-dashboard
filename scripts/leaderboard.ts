import { sql } from '../db/client.js';
import { getLeaderboard } from './api.js';

export async function snapshotLeaderboard(): Promise<void> {
  const entries = await getLeaderboard();
  if (entries.length === 0) {
    console.log('[leaderboard] empty');
    return;
  }
  const snapshotAt = new Date();
  const values = entries.map(e => ({
    snapshot_at: snapshotAt,
    rank: e.rank,
    user_id: e.userId,
    username: e.user?.username ?? null,
    slug: e.user?.slug ?? null,
    total_points: e.totalPoints,
    points_today: e.pointsToday,
  }));
  await sql`
    INSERT INTO leaderboard_snapshots ${sql(values,
      'snapshot_at', 'rank', 'user_id', 'username', 'slug', 'total_points', 'points_today'
    )}
    ON CONFLICT (snapshot_at, user_id) DO NOTHING
  `;
  console.log(`[leaderboard] snapshotted ${entries.length} users at ${snapshotAt.toISOString()}`);
}
