'use client';

import Link from 'next/link';
import { NavGlyph, SearchIcon, InfoIcon } from './Icons';
import { Mono } from './primitives';
import { NAV, type NavKey } from './NavLinks';

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
      {/* Desktop side nav */}
      <aside
        className="hidden w-56 shrink-0 flex-col border-r md:flex"
        style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
      >
        <div className="border-b px-4 py-4" style={{ borderColor: 'var(--line)' }}>
          <Link href="/" className="flex items-center gap-2">
            <BrandSquare />
            <Mono style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--fg)' }}>MNSTR</Mono>
          </Link>
          <div
            className="mt-1 text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}
          >
            on-chain analytics
          </div>
        </div>
        <nav className="flex-1 px-1 py-3">
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 transition-colors"
                style={{
                  background: on ? 'var(--bg-2)' : 'transparent',
                  borderLeft: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <NavGlyph name={item.key} active={on} />
                <Mono
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
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
        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--line)' }}>
          {themeToggle}
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
          <div className="flex h-12 items-center gap-2 px-3">
            <Link href="/" className="md:hidden flex items-center gap-2">
              <BrandSquare />
              <Mono style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--fg)' }}>MNSTR</Mono>
            </Link>
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>
              / {meta.title}
            </Mono>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="live-dot" />
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em', marginRight: 4 }}>
                LIVE
              </Mono>
              <IconButton onClick={onSearch} ariaLabel="Search">
                <SearchIcon />
              </IconButton>
              <IconButton onClick={onInfo} ariaLabel="Methodology">
                <InfoIcon />
              </IconButton>
              <div className="md:hidden">{themeToggle}</div>
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

function BrandSquare() {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
        boxShadow: '0 0 10px color-mix(in oklch, var(--accent) 40%, transparent)',
        display: 'inline-block',
      }}
    />
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
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
