import type { Metadata } from 'next';
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
