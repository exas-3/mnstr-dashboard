import type { Metadata, Viewport } from 'next';
import './globals.css';
import { fontClasses } from './fonts';
import Shell from '@/components/Shell';

// Plausible — privacy-friendly analytics. Served same-origin: nginx proxies
// /js/pa-*.js and /api/event to the Plausible instance on :3001 and rewrites
// the script's hardcoded http://IP:3001 endpoint to https://mnstr.watch, so
// the browser never makes a mixed-content request. Override via
// NEXT_PUBLIC_PLAUSIBLE_SRC for other deployments.
const PLAUSIBLE_SRC =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ||
  '/js/pa-1J_aFxeWPXTRucUP7Z47G.js';

// Canonical origin for OG / Twitter / sitemap resolution. Defaults to the
// future production domain; override via env for staging or to keep the IP
// canonical until the DNS cutover happens.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MnStr · Watch — Pokémon TCG & One Piece gacha analytics',
    template: '%s · MnStr · Watch',
  },
  description:
    'Live on-chain analytics for the MnStr gacha — graded Pokémon TCG and One Piece collectible cards. Track pack pulls, buyback vs FMV pricing, big hits, and house edge.',
  applicationName: 'MnStr · Watch',
  keywords: [
    'MnStr', 'MnStr gacha', 'MnStr watch',
    'Pokémon TCG', 'Pokemon cards', 'graded Pokemon cards',
    'One Piece TCG', 'One Piece cards',
    'TCG', 'collectible cards', 'card collecting', 'gacha',
    'card gacha', 'pack pulls', 'buyback', 'FMV', 'fair market value',
    'on-chain analytics', 'card vault', 'trading card analytics',
  ],
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'MnStr · Watch — Pokémon TCG & One Piece gacha analytics',
    description:
      'Live on-chain analytics for the MnStr gacha — graded Pokémon TCG and One Piece collectible cards. Pack pulls, buyback vs FMV, big hits, house edge.',
    siteName: 'MnStr · Watch',
    url: '/',
    images: ['/og-default.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MnStr · Watch — Pokémon TCG & One Piece gacha analytics',
    description:
      'Live analytics for the MnStr Pokémon TCG & One Piece card gacha — pulls, buyback vs FMV, big hits.',
    images: ['/og-default.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#d6a04a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="foil" className={fontClasses}>
      <body className="min-h-dvh">
        <Shell>{children}</Shell>

        {/* Privacy-friendly analytics by Plausible */}
        <script async src={PLAUSIBLE_SRC} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()',
          }}
        />
      </body>
    </html>
  );
}
