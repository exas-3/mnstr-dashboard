import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { fontClasses } from './fonts';
import Shell from '@/components/Shell';
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from '@/lib/theme';

// Plausible — opt-in analytics. Set NEXT_PUBLIC_PLAUSIBLE_SRC in the env to
// enable; the script is only emitted when the env var is non-empty.
// The URL is fetched by the *browser*, so it must be reachable from users'
// machines (i.e. not `localhost` in a production deploy).
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? '';

export const metadata: Metadata = {
  title: 'MnStr — On-chain gacha analytics',
  description: 'Live analytics for the MnStr gacha on MegaETH',
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

        {/* Plausible analytics — only emitted when NEXT_PUBLIC_PLAUSIBLE_SRC is set. */}
        {PLAUSIBLE_SRC && (
          <>
            <Script src={PLAUSIBLE_SRC} strategy="afterInteractive" async />
            <Script id="plausible-init" strategy="afterInteractive">
              {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
