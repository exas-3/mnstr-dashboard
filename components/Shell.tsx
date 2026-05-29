'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import SearchOverlay from './SearchOverlay';
import CaveatSheet from './CaveatSheet';
import FoilShell from './FoilShell';
import { metaFor, activeKey } from './NavLinks';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
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

  return (
    <FoilShell
      meta={meta}
      active={active}
      onSearch={() => setSearchOpen(true)}
      onInfo={() => setInfoOpen(true)}
      overlays={overlays}
    >
      {children}
    </FoilShell>
  );
}
