'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SearchOverlay from './SearchOverlay';
import CaveatSheet from './CaveatSheet';
import FoilShell from './FoilShell';
import { metaFor, activeKey } from './NavLinks';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const meta = metaFor(pathname);
  const active = activeKey(pathname);

  // Global search hotkeys: ⌘K / Ctrl+K anywhere (the header badge advertises it),
  // plus '/' when the user isn't typing into a form field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Embed routes strip all chrome. Used by /embed/live for OBS streamers.
  // Pathname-based (not ?embed=) so the rest of the site stays statically
  // renderable — useSearchParams here would opt every route's chrome out of
  // static rendering.
  if (pathname.startsWith('/embed')) {
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
