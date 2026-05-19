'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NAV } from './NavLinks';
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
      {/* Desktop side nav */}
      <aside
        className="hidden w-56 shrink-0 flex-col border-r md:flex"
        style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }}
      >
        <div className="border-b px-3 py-4" style={{ borderColor: 'var(--accent-dim)' }}>
          <Link href="/" className="block">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                color: 'var(--accent)',
                textShadow: '0 0 8px color-mix(in oklch, var(--accent) 53%, transparent)',
                letterSpacing: '0.05em',
              }}
            >
              /MNSTR
            </span>
          </Link>
          <div className="mt-1" style={{ color: 'var(--fg-3)', fontSize: 9.5, letterSpacing: '0.08em' }}>
            /* on-chain analytics */
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 grid gap-1.5">
          {NAV.map(item => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-baseline gap-2 px-2 py-2"
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
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--accent-dim)' }}>
          {themeToggle}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 border-b"
          style={{
            borderColor: 'var(--accent-dim)',
            background: 'var(--bg)',
          }}
        >
          <div className="flex h-12 items-center gap-2 px-3">
            <Link href="/" className="md:hidden inline-flex items-baseline gap-1.5">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  color: 'var(--accent)',
                  textShadow: '0 0 8px color-mix(in oklch, var(--accent) 53%, transparent)',
                  letterSpacing: '0.05em',
                }}
              >
                /MNSTR
              </span>
            </Link>
            <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>::</span>
            <span style={{ color: 'var(--fg-2)', fontSize: 11, letterSpacing: '0.08em' }}>
              {meta.title}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <BlinkDot />
              <span style={{ color: 'var(--fg-3)', fontSize: 9, letterSpacing: '0.1em', marginRight: 4 }}>
                LIVE
              </span>
              <BracketBtn onClick={onSearch} aria-label="Search">[/]</BracketBtn>
              <BracketBtn onClick={onInfo} aria-label="Methodology">[?]</BracketBtn>
              <div className="md:hidden">{themeToggle}</div>
            </div>
          </div>
          {meta.sub && (
            <div className="px-3 pb-1.5 md:hidden" style={{ color: 'var(--fg-4)', fontSize: 9.5, letterSpacing: '0.04em' }}>
              {meta.sub}
            </div>
          )}
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        {/* Mobile function-key bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-0.5 border-t px-1 py-1.5 md:hidden"
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

function BracketBtn({
  children,
  onClick,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
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
