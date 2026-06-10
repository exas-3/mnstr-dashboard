// Canonical site identity — single source of truth for the production origin,
// display name, and description. Shared by the root metadata export and the
// schema.org JSON-LD structured data so the two never drift. Override the
// origin via NEXT_PUBLIC_SITE_URL for staging / pre-DNS-cutover deploys.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

export const SITE_NAME = 'MnStr · Watch';

export const SITE_DESCRIPTION =
  'Live on-chain analytics for the MnStr gacha — graded Pokémon TCG and One Piece collectible cards. Track pack pulls, buyback vs FMV pricing, big hits, and house edge.';
