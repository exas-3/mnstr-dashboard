/* Server-startup hook — Next runs register() once when the server boots.
 * Starts the leaderboard background refresh so the /wallets board is recomputed
 * on a fixed 60s cadence and served warm from cache (computed once a minute,
 * never per request). Node runtime only — guarded so it never runs during the
 * build or on the edge. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startLeaderboardRefresh } = await import('@/lib/queries/wallets');
    startLeaderboardRefresh();
  }
}
