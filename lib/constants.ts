/* Constants shared across server + client bundles. These pairs used to be
 * duplicated per file with "keep in sync" comments; a drift was silent and
 * user-visible (e.g. a PAGE_SIZE mismatch made every /wallets request miss
 * the leaderboard cache warm-up key and recompute the ~1s board). Importing
 * a numeric constant costs the client bundle nothing. */

// Leaderboard page size — SSR first page, /api/wallets pagination, and the
// background cache warm-up key must all agree.
export const WALLETS_PAGE_SIZE = 25;

// Live-feed hard cap — the client's Show More ceiling and the /api/live
// limit clamp must agree. Sized to cover ~1 week of pulls.
export const LIVE_FEED_MAX = 6000;
