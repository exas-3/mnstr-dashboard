export const NAV = [
  { href: '/',            label: 'Pulse',   key: 'pulse',       fkey: 'F1', sub: 'live + home' },
  { href: '/tiers',       label: 'Tiers',   key: 'tiers',       fkey: 'F2', sub: 'economics'   },
  { href: '/wallets',     label: 'Wallets', key: 'wallets',     fkey: 'F3', sub: 'leaderboard' },
  { href: '/cards',       label: 'Cards',   key: 'cards',       fkey: 'F4', sub: 'vault'       },
  { href: '/marketplace', label: 'Market',  key: 'marketplace', fkey: 'F5', sub: 'secondary'   },
] as const;

export type NavKey = (typeof NAV)[number]['key'];

// `h1` is the single page-level <h1> for the index routes — rendered once in the
// shell (outside the streamed page body) so the served HTML carries exactly one
// h1. Detail routes (/cards/<slug>, /wallets/<addr>) omit it and supply their
// own content h1 (the card title / wallet handle).
const TITLES: Record<string, { title: string; sub: string; h1?: string }> = {
  '/':            { title: 'PULSE',       sub: 'GLOBAL · LIVE',        h1: 'MnStr live pulse — Pokémon TCG & One Piece gacha analytics' },
  '/tiers':       { title: 'TIERS',       sub: 'PACK ECONOMICS',       h1: 'MnStr pack tiers — prices, EV & house edge' },
  '/wallets':     { title: 'WALLETS',     sub: 'LEADERBOARD',          h1: 'MnStr wallet leaderboard — net P&L, spend & pulls' },
  '/cards':       { title: 'CARDS',       sub: 'THE WALL',             h1: 'MnStr card vault — graded Pokémon TCG & One Piece cards' },
  // /marketplace is statically prerendered, where the shell suspends and its h1
  // wouldn't make the HTML — but a static page isn't stream-duplicated, so it
  // safely keeps its own page-level h1 instead.
  '/marketplace': { title: 'MARKETPLACE', sub: 'SECONDARY · ALL-TIME' },
};

export function metaFor(pathname: string): { title: string; sub: string; h1?: string } {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/wallets/')) return { title: 'WALLET', sub: 'DETAIL' };
  if (pathname.startsWith('/cards/'))   return { title: 'CARD',   sub: 'DETAIL' };
  return { title: '—', sub: '' };
}

export function activeKey(pathname: string): NavKey | '' {
  if (pathname === '/') return 'pulse';
  if (pathname.startsWith('/tiers'))       return 'tiers';
  if (pathname.startsWith('/wallets'))     return 'wallets';
  if (pathname.startsWith('/cards'))       return 'cards';
  if (pathname.startsWith('/marketplace')) return 'marketplace';
  return '';
}
