'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import SearchOverlay from './SearchOverlay';
import CaveatSheet from './CaveatSheet';
import FoilShell from './FoilShell';
import ArcadeShell from './ArcadeShell';
import { metaFor, activeKey } from './NavLinks';
import type { Theme } from '@/lib/theme';

export default function Shell({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ShellInner theme={theme}>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const meta = metaFor(pathname);
  const active = activeKey(pathname);

  // Embed mode: strip all chrome. Used by /live?embed=1 for OBS streamers.
  if (params.get('embed') === '1' || params.get('embed') === 'true') {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100dvh' }}>
        {children}
      </div>
    );
  }

  const overlays = (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CaveatSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );

  const themeToggle = <ThemeToggle />;

  if (theme === 'arcade') {
    return (
      <ArcadeShell
        meta={meta}
        active={active}
        onSearch={() => setSearchOpen(true)}
        onInfo={() => setInfoOpen(true)}
        themeToggle={themeToggle}
        overlays={overlays}
      >
        {children}
      </ArcadeShell>
    );
  }

  return (
    <FoilShell
      meta={meta}
      active={active}
      onSearch={() => setSearchOpen(true)}
      onInfo={() => setInfoOpen(true)}
      themeToggle={themeToggle}
      overlays={overlays}
    >
      {children}
    </FoilShell>
  );
}
