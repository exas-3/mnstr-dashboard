export const NAV = [
  { href: '/',        label: 'Pulse',   key: 'pulse',   fkey: 'F1', sub: 'home'        },
  { href: '/tiers',   label: 'Tiers',   key: 'tiers',   fkey: 'F2', sub: 'economics'   },
  { href: '/wallets', label: 'Wallets', key: 'wallets', fkey: 'F3', sub: 'leaderboard' },
  { href: '/cards',   label: 'Cards',   key: 'cards',   fkey: 'F4', sub: 'vault'       },
  { href: '/live',    label: 'Live',    key: 'live',    fkey: 'F5', sub: 'stream'      },
] as const;

export type NavKey = (typeof NAV)[number]['key'];

const TITLES: Record<string, { title: string; sub: string }> = {
  '/':        { title: 'PULSE',   sub: 'GLOBAL · LIVE' },
  '/tiers':   { title: 'TIERS',   sub: 'PACK ECONOMICS' },
  '/wallets': { title: 'WALLETS', sub: 'LEADERBOARD' },
  '/cards':   { title: 'CARDS',   sub: 'THE WALL' },
  '/live':    { title: 'LIVE',    sub: '● STREAMING · 5S POLL' },
};

export function metaFor(pathname: string): { title: string; sub: string } {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/wallets/')) return { title: 'WALLET', sub: 'DETAIL' };
  if (pathname.startsWith('/cards/'))   return { title: 'CARD',   sub: 'DETAIL' };
  return { title: '—', sub: '' };
}

export function activeKey(pathname: string): NavKey | '' {
  if (pathname === '/') return 'pulse';
  if (pathname.startsWith('/tiers'))   return 'tiers';
  if (pathname.startsWith('/wallets')) return 'wallets';
  if (pathname.startsWith('/cards'))   return 'cards';
  if (pathname.startsWith('/live'))    return 'live';
  return '';
}
