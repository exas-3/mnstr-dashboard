'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NAV } from './NavLinks';
import { MnstrWatch } from './MnstrWatch';
import ThemePill from './ThemePill';
import BlockCounter from './BlockCounter';
import type { ShellProps } from './FoilShell';

export default function ArcadeShell({
  meta,
  active,
  onSearch,
  onInfo,
  themeToggle,
  overlays,
  children,
}: ShellProps) {
  return (
    <div
      className="flex min-h-dvh flex-col md:flex-row"
      style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
    >
      <aside
        className="sticky top-0 hidden h-dvh shrink-0 flex-col self-start overflow-y-auto border-r md:flex md:w-[184px] xl:w-[208px]"
        style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }}
      >
        <div className="border-b px-3 py-4" style={{ borderColor: 'var(--accent-dim)' }}>
          <Link href="/" className="flex items-center gap-2">
            <MnstrWatch size={28} mono color="var(--accent)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                color: 'var(--accent)',
                letterSpacing: '0.04em',
                textShadow: '0 0 6px color-mix(in oklch, var(--accent) 53%, transparent)',
              }}
            >
              MN$TR
            </span>
          </Link>
          <div
            className="mt-1"
            style={{ color: 'var(--fg-3)', fontSize: 9.5, letterSpacing: '0.08em' }}
          >
            /* on-chain analytics */
          </div>
        </div>

        <div className="px-3 pt-3 pb-1">
          <span style={{ color: 'var(--fg-4)', fontSize: 9, letterSpacing: '0.18em' }}>NAVIGATE</span>
        </div>
        <nav className="flex-1 px-2 pb-3 grid gap-1.5">
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2 px-2 py-2"
                style={{
                  background: on
                    ? 'color-mix(in oklch, var(--accent) 13%, transparent)'
                    : 'transparent',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--fg-4)'}`,
                  color: on ? 'var(--accent)' : 'var(--fg-3)',
                  textShadow: on ? '0 0 6px var(--accent)' : 'none',
                }}
              >
                <span style={{ color: 'var(--fg-4)', fontSize: 8 }}>[{item.fkey}]</span>
                <span className="flex min-w-0 flex-col">
                  <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.08em' }}>
                    {item.sub}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-2 pb-1">
          <span style={{ color: 'var(--fg-4)', fontSize: 9, letterSpacing: '0.18em' }}>SHORTCUTS</span>
        </div>
        <div className="px-3 pb-3 grid gap-1">
          <ShortcutRow combo="^K" label="search" />
          <ShortcutRow combo="^/" label="theme" />
          <ShortcutRow combo="^E" label="stream" />
        </div>

        <div
          className="hidden border-t px-3 py-3 xl:block"
          style={{ borderColor: 'var(--accent-dim)' }}
        >
          <span
            style={{
              color: 'var(--fg-4)',
              fontSize: 9,
              letterSpacing: '0.18em',
              display: 'block',
              marginBottom: 6,
            }}
          >
            STATUS
          </span>
          <StatusRow label="INDEXER" value="● OK" valueColor="var(--accent)" />
          <StatusRow label="POLL" value="5s" />
          <StatusRow label="LAG" value="<+5s" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 border-b"
          style={{
            borderColor: 'var(--accent-dim)',
            background: 'var(--bg)',
          }}
        >
          <div className="flex h-12 items-center gap-2 px-3 md:h-14">
            <Link href="/" className="md:hidden inline-flex items-center gap-2">
              <MnstrWatch size={24} mono color="var(--accent)" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--accent)',
                  letterSpacing: '0.04em',
                  textShadow: '0 0 6px color-mix(in oklch, var(--accent) 53%, transparent)',
                }}
              >
                MN$TR
              </span>
            </Link>

            <span className="hidden md:inline" style={{ color: 'var(--fg-4)', fontSize: 11 }}>
              ::
            </span>
            <span
              className="hidden md:inline"
              style={{ color: 'var(--fg-2)', fontSize: 11, letterSpacing: '0.08em' }}
            >
              {meta.title.toLowerCase()}
            </span>
            <span className="md:hidden" style={{ color: 'var(--fg-4)', fontSize: 11 }}>
              ::
            </span>
            <span className="md:hidden" style={{ color: 'var(--fg-2)', fontSize: 11, letterSpacing: '0.08em' }}>
              {meta.title}
            </span>

            {/* Inline search button (md+) */}
            <button
              type="button"
              onClick={onSearch}
              className="hidden md:flex ml-3 flex-1 max-w-md items-center gap-2 px-2.5 py-1.5"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--fg-4)',
                color: 'var(--fg-3)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
              aria-label="Open search"
            >
              <span style={{ fontSize: 11 }}>[/]</span>
              <span style={{ fontSize: 10.5, letterSpacing: '0.04em' }}>
                grep wallets, cards, sets…
              </span>
              <span
                className="ml-auto"
                style={{
                  fontSize: 9,
                  color: 'var(--fg-4)',
                  padding: '1px 5px',
                  border: '1px solid var(--fg-4)',
                  letterSpacing: '0.06em',
                }}
              >
                ^K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2 md:ml-3">
              <span className="hidden md:inline-flex items-center gap-1.5">
                <BlinkDot />
                <span style={{ color: 'var(--fg-3)', fontSize: 9, letterSpacing: '0.14em' }}>
                  LIVE :: 5s POLL
                </span>
              </span>

              <span className="hidden md:inline">
                <BlockCounter initial={null} />
              </span>

              <span className="md:hidden inline-flex items-center gap-1.5">
                <BlinkDot />
                <span style={{ color: 'var(--fg-3)', fontSize: 9, letterSpacing: '0.1em', marginRight: 4 }}>
                  LIVE
                </span>
              </span>

              <BracketBtn onClick={onSearch} aria-label="Search" className="md:hidden">[/]</BracketBtn>
              <BracketBtn onClick={onInfo} aria-label="Methodology">[?]</BracketBtn>

              <span className="hidden md:inline">
                <ThemePill />
              </span>
              <span className="md:hidden">{themeToggle}</span>
            </div>
          </div>
          {meta.sub && (
            <div className="px-3 pb-1.5 md:hidden" style={{ color: 'var(--fg-4)', fontSize: 9.5, letterSpacing: '0.04em' }}>
              {meta.sub}
            </div>
          )}
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 gap-0.5 border-t px-1 py-1.5 md:hidden"
          style={{
            borderColor: 'var(--accent)',
            background: 'var(--bg)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0), 6px)',
          }}
        >
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5"
                style={{
                  background: on
                    ? 'color-mix(in oklch, var(--accent) 13%, transparent)'
                    : 'transparent',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--fg-4)'}`,
                  color: on ? 'var(--accent)' : 'var(--fg-3)',
                  textShadow: on ? '0 0 6px var(--accent)' : 'none',
                }}
              >
                <span style={{ color: 'var(--fg-4)', fontSize: 8 }}>[{item.fkey}]</span>
                <span style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                  {item.label.toUpperCase()}
                </span>
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
          border: '1px solid var(--fg-4)',
        }}
      >
        {combo}
      </span>
      <span style={{ fontSize: 9.5, color: 'var(--fg-4)', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
}

function StatusRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '2px 0' }}>
      <span style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontSize: 9, color: valueColor ?? 'var(--fg-3)', letterSpacing: '0.06em' }}>{value}</span>
    </div>
  );
}

function BracketBtn({
  children,
  onClick,
  'aria-label': ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
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
        padding: '2px 6px',
        border: '1px solid var(--fg-3)',
        color: 'var(--fg-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
      }}
    >
      {children}
    </button>
  );
}

function BlinkDot() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => setOn(b => !b), 700);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span aria-hidden style={{ color: 'var(--accent)', fontSize: 10 }}>
      {on ? '●' : '○'}
    </span>
  );
}
