'use client';

import Link from 'next/link';
import { NavGlyph, SearchIcon, InfoIcon } from './Icons';
import { Mono } from './primitives';
import { NAV, type NavKey } from './NavLinks';
import { MnstrWatch } from './MnstrWatch';
import ThemePill from './ThemePill';
import BlockCounter from './BlockCounter';

export interface ShellProps {
  meta: { title: string; sub: string };
  active: NavKey | '';
  onSearch: () => void;
  onInfo: () => void;
  themeToggle: React.ReactNode;
  overlays: React.ReactNode;
  children: React.ReactNode;
}

export default function FoilShell({
  meta,
  active,
  onSearch,
  onInfo,
  themeToggle,
  overlays,
  children,
}: ShellProps) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Side rail — sticky on md+, hidden on mobile (bottom nav replaces it). */}
      <aside
        className="sticky top-0 hidden h-dvh shrink-0 flex-col self-start overflow-y-auto border-r md:flex md:w-[184px] xl:w-[208px]"
        style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
      >
        <div className="border-b px-3 py-4" style={{ borderColor: 'var(--line)' }}>
          <Link href="/" className="flex items-center gap-2">
            <MnstrWatch size={28} mascotUrl="/mascot.svg" />
            <span
              style={{
                fontFamily: 'var(--font-blackletter), UnifrakturCook, serif',
                fontWeight: 700,
                fontSize: 22,
                color: 'var(--fg)',
                letterSpacing: 0,
              }}
            >
              Mn$tr
            </span>
          </Link>
          <Mono
            style={{ marginTop: 4, fontSize: 9.5, color: 'var(--fg-4)', letterSpacing: '0.12em', display: 'block' }}
          >
            on-chain analytics
          </Mono>
        </div>

        <div className="px-3 pt-3 pb-1">
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.18em' }}>NAVIGATE</Mono>
        </div>
        <nav className="flex-1 px-1.5 pb-3">
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2.5 px-2 py-2 transition-colors"
                style={{
                  background: on ? 'var(--bg-2)' : 'transparent',
                  borderLeft: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <NavGlyph name={item.key} active={on} />
                <span className="flex min-w-0 flex-col">
                  <Mono
                    style={{
                      fontSize: 10.5,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: on ? 'var(--accent)' : 'var(--fg-2)',
                    }}
                  >
                    {item.label}
                  </Mono>
                  <Mono
                    style={{
                      fontSize: 8.5,
                      letterSpacing: '0.08em',
                      color: 'var(--fg-4)',
                      marginTop: 1,
                    }}
                  >
                    {item.sub}
                  </Mono>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-2 pb-1">
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.18em' }}>SHORTCUTS</Mono>
        </div>
        <div className="px-3 pb-3 grid gap-1">
          <ShortcutRow combo="⌘K" label="search" />
          <ShortcutRow combo="⌘/" label="theme" />
          <ShortcutRow combo="⌘E" label="stream" />
        </div>

        <div className="hidden border-t px-3 py-3 xl:block" style={{ borderColor: 'var(--line)' }}>
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.18em', display: 'block', marginBottom: 6 }}>
            STATUS
          </Mono>
          <StatusRow label="INDEXER" value="● OK" valueColor="var(--accent)" />
          <StatusRow label="POLL" value="5s" />
          <StatusRow label="LAG" value="<+5s" />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 border-b"
          style={{
            borderColor: 'var(--line-soft)',
            background: 'color-mix(in oklch, var(--bg) 94%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Row 1 — present on all sizes */}
          <div className="flex h-12 items-center gap-2 px-3 md:h-14">
            {/* Mobile mark only */}
            <Link href="/" className="md:hidden flex items-center gap-2">
              <MnstrWatch size={24} mascotUrl="/mascot.svg" />
              <span
                style={{
                  fontFamily: 'var(--font-blackletter), UnifrakturCook, serif',
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--fg)',
                }}
              >
                Mn$tr
              </span>
            </Link>

            {/* Title slug */}
            <Mono
              className="hidden md:inline"
              style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
            >
              // {meta.title.toLowerCase()}
            </Mono>
            <Mono
              className="md:hidden"
              style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em' }}
            >
              / {meta.title}
            </Mono>

            {/* Inline search button (md+) */}
            <button
              type="button"
              onClick={onSearch}
              className="hidden md:flex ml-3 flex-1 max-w-md items-center gap-2 px-2.5 py-1.5 transition-colors"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line-soft)',
                color: 'var(--fg-3)',
                cursor: 'pointer',
              }}
              aria-label="Open search"
            >
              <SearchIcon />
              <Mono style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--fg-3)' }}>
                Search wallets, cards, sets…
              </Mono>
              <span
                className="ml-auto"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--fg-4)',
                  padding: '1px 5px',
                  border: '1px solid var(--line-soft)',
                  letterSpacing: '0.06em',
                }}
              >
                ⌘K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2 md:ml-3">
              {/* LIVE indicator */}
              <span className="hidden md:inline-flex items-center gap-1.5">
                <span className="live-dot" />
                <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.14em' }}>
                  LIVE · 5s POLL
                </Mono>
              </span>

              <span className="hidden md:inline">
                <BlockCounter initial={null} />
              </span>

              {/* Mobile-only LIVE chip */}
              <span className="md:hidden inline-flex items-center gap-1.5">
                <span className="live-dot" />
                <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em', marginRight: 4 }}>
                  LIVE
                </Mono>
              </span>

              <IconButton onClick={onSearch} ariaLabel="Search" className="md:hidden">
                <SearchIcon />
              </IconButton>
              <IconButton onClick={onInfo} ariaLabel="Methodology">
                <InfoIcon />
              </IconButton>

              {/* Theme: segmented pill on md+, small toggle on mobile. */}
              <span className="hidden md:inline">
                <ThemePill />
              </span>
              <span className="md:hidden">{themeToggle}</span>
            </div>
          </div>

          {meta.sub && (
            <div className="px-3 pb-1.5 md:hidden">
              <Mono style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
                {meta.sub}
              </Mono>
            </div>
          )}
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t md:hidden"
          style={{
            borderColor: 'var(--line-soft)',
            background: 'color-mix(in oklch, var(--bg) 93%, transparent)',
            backdropFilter: 'blur(14px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0), 4px)',
          }}
        >
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2"
              >
                {on && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: 16,
                      height: 2,
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)',
                    }}
                  />
                )}
                <NavGlyph name={item.key} active={on} />
                <Mono
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: on ? 'var(--accent)' : 'var(--fg-3)',
                  }}
                >
                  {item.label}
                </Mono>
              </Link>
            );
          })}
        </nav>
      </div>

      {overlays}
    </div>
  );
}

function ShortcutRow({ combo, label }: { combo: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-3)',
          padding: '1px 5px',
          border: '1px solid var(--line-soft)',
        }}
      >
        {combo}
      </span>
      <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', letterSpacing: '0.04em' }}>{label}</Mono>
    </div>
  );
}

function StatusRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '2px 0' }}>
      <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>{label}</Mono>
      <Mono style={{ fontSize: 9, color: valueColor ?? 'var(--fg-3)', letterSpacing: '0.06em' }}>{value}</Mono>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--line)',
        background: 'var(--bg-2)',
      }}
    >
      {children}
    </button>
  );
}
