import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { fontClasses } from './fonts';
import Shell from '@/components/Shell';
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from '@/lib/theme';

// Plausible — privacy-friendly analytics. Defaults to the snippet's literal
// localhost:3001 (works when running Plausible alongside the dashboard on
// the same box). For deployed instances, override via NEXT_PUBLIC_PLAUSIBLE_SRC
// in .env so visitors' browsers can actually reach the script.
const PLAUSIBLE_SRC =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ||
  'http://localhost:3001/js/pa-otWkGMENf8W9OIVErtvJY.js';

// Canonical origin for OG / Twitter / sitemap resolution. Defaults to the
// future production domain; override via env for staging or to keep the IP
// canonical until the DNS cutover happens.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MnStr · Watch — Live MnStr gacha analytics on MegaETH',
    template: '%s · MnStr · Watch',
  },
  description: 'A treasury of monsters. Public dashboard for the MnStr gacha card vault on MegaETH.',
  applicationName: 'MnStr · Watch',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'MnStr · Watch',
    description: 'Live analytics for the MnStr gacha vault on MegaETH.',
    siteName: 'MnStr · Watch',
    url: '/',
    images: ['/og-default.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MnStr · Watch',
    description: 'A treasury of monsters. Live analytics for the MnStr gacha on MegaETH.',
    images: ['/og-default.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#d6a04a',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const raw = store.get(THEME_COOKIE)?.value;
  const theme = isTheme(raw) ? raw : DEFAULT_THEME;
  return (
    <html lang="en" data-theme={theme} className={fontClasses}>
      <body className="min-h-dvh">
        <Shell theme={theme}>{children}</Shell>
        {theme === 'arcade' && <div className="crt-overlay" aria-hidden />}

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
