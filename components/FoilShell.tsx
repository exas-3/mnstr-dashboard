'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NavGlyph, SearchIcon, InfoIcon } from './Icons';
import { Mono } from './primitives';
import { NAV, type NavKey } from './NavLinks';
import { MnstrWatch } from './MnstrWatch';

const COLLAPSE_KEY = 'mnstr.sidebar.collapsed';

export interface ShellProps {
  meta: { title: string; sub: string };
  active: NavKey | '';
  onSearch: () => void;
  onInfo: () => void;
  overlays: React.ReactNode;
  children: React.ReactNode;
}

export default function FoilShell({
  meta,
  active,
  onSearch,
  onInfo,
  overlays,
  children,
}: ShellProps) {
  // Collapsed sidebar = icon-only rail, full sidebar = icons + labels.
  // Persisted in localStorage so the choice survives navigation. SSR renders
  // expanded; the localStorage read happens post-mount so hydration matches.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);
  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Side rail — sticky on md+, hidden on mobile (bottom nav replaces it).
       * Width swaps based on `collapsed`: 56px icon-only vs the original
       * 184px / 208px expanded layout. */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col self-start overflow-y-auto border-r md:flex ${
          collapsed ? 'md:w-[96px]' : 'md:w-[184px] xl:w-[208px]'
        }`}
        style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
      >
        {/* Header doubles as the collapse toggle. Title + subtitle hidden when
         * collapsed; logo alone clicks to expand again. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`flex items-center border-b px-3 py-4 text-left transition-colors hover:bg-[var(--bg-2)] ${
            collapsed ? 'justify-center' : 'gap-2'
          }`}
          style={{ borderColor: 'var(--line)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <MnstrWatch size={72} mascotUrl="/mascot.svg" />
          ) : (
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-blackletter), UnifrakturCook, serif',
                    fontWeight: 700,
                    fontSize: 30,
                    color: 'var(--fg)',
                    letterSpacing: 0,
                    lineHeight: 1,
                  }}
                >
                  Mn$tr
                </span>
                <MnstrWatch size={44} mascotUrl="/mascot.svg" />
              </span>
              <Mono
                style={{ marginTop: 4, fontSize: 9.5, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
              >
                on-chain analytics
              </Mono>
            </span>
          )}
        </button>

        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.18em' }}>NAVIGATE</Mono>
          </div>
        )}
        <nav className="flex-1 px-1.5 pb-3">
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`flex items-center transition-colors ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2 py-2'
                }`}
                style={{
                  background: on ? 'var(--bg-2)' : 'transparent',
                  borderLeft: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <NavGlyph name={item.key} active={on} size={collapsed ? 40 : 26} />
                {!collapsed && (
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
                )}
              </Link>
            );
          })}
        </nav>
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

        <main className="flex-1">{children}</main>

        {/* Page-level legal + credit footer. TERMS · PRIVACY on the left,
         * developer credit pushed to the right via flex justify-between. The
         * mobile bottom nav is fixed and overlays the page; pb-28 reserves
         * the nav height so footer text stays visible when scrolled. */}
        <footer
          className="flex items-center justify-between gap-3 flex-wrap px-3 py-4 pb-28 md:pb-4"
          style={{
            borderTop: '1px solid var(--line-soft)',
            background: 'var(--bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.12em',
            color: 'var(--fg-4)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/terms" style={{ color: 'var(--fg-3)' }}>TERMS</Link>
            <span>·</span>
            <Link href="/privacy" style={{ color: 'var(--fg-3)' }}>PRIVACY</Link>
          </div>
          <a
            href="https://x.com/0xExas"
            target="_blank"
            rel="noreferrer noopener"
            style={{
              color: 'var(--fg-3)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.1em',
            }}
          >
            Developed with{' '}
            <span style={{ color: 'var(--accent)', fontSize: '1.7em', lineHeight: 1, verticalAlign: '-0.05em' }}>
              ♥
            </span>
            {' '}by <span style={{ color: 'var(--accent)' }}>@0xExas</span>
          </a>
        </footer>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t md:hidden"
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
                <NavGlyph name={item.key} active={on} size={24} />
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
