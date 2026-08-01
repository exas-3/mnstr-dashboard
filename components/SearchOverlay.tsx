'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Mono } from './primitives';
import { cardImageUrl } from '@/lib/img';
import CardThumb from './CardThumb';
import { shortAddr, abbrUsdStr } from '@/lib/format';

interface WalletHit {
  wallet: string;
  handle: string | null;
  net: number;
  spend: number;
  pulls: number;
}

interface CardHit {
  slug: string;
  title: string | null;
  card_set: string | null;
  grading: string | null;
  image_front: string | null;
  fmv: number | null;
  pulls: number;
}

interface SearchResponse {
  q: string;
  wallets: WalletHit[];
  cards: CardHit[];
}

interface ResultItem {
  kind: 'wallet' | 'card' | 'nav';
  key: string;
  href: string;
  primary: string;
  secondary?: string;
  trailing?: string;
  imageUrl?: string | null;
}

const QUICK_LINKS: ResultItem[] = [
  { kind: 'nav', key: 'nav-pulse',   href: '/',        primary: 'Pulse',   secondary: 'live activity + KPIs' },
  { kind: 'nav', key: 'nav-tiers',   href: '/tiers',   primary: 'Tiers',   secondary: 'pack economics by IP' },
  { kind: 'nav', key: 'nav-wallets', href: '/wallets', primary: 'Wallets', secondary: 'leaderboard' },
  { kind: 'nav', key: 'nav-cards',       href: '/cards',       primary: 'Cards',       secondary: 'the vault' },
  { kind: 'nav', key: 'nav-marketplace', href: '/marketplace', primary: 'Marketplace', secondary: 'secondary trades' },
];

/** Stable DOM id per result row — combobox aria-activedescendant target. */
function optionId(key: string): string {
  return `search-opt-${key}`;
}

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Reset state every time the overlay opens.
  useEffect(() => {
    if (open) {
      setQ('');
      setResults(null);
      setFailed(false);
      setSelectedIdx(0);
      // Focus on next tick, after the input is in the DOM.
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open]);

  // While open: remember the opener, trap Tab inside the panel, close on Esc
  // from anywhere (focus can sit on a result link), restore focus on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prev?.focus();
    };
  }, [open, onClose]);

  // Lock body scroll behind the overlay.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Debounced fetch on `q` change. Each run owns an AbortController so a slow
  // out-of-order response can't overwrite fresher results; as a second guard we
  // only accept a response whose echoed `q` matches the query we asked for.
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    const ctrl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: 'no-store',
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setFailed(true);
          setLoading(false);
          return;
        }
        const json = (await res.json()) as SearchResponse;
        if (json.q !== trimmed) return; // stale echo — a newer run owns the state
        setResults(json);
        setSelectedIdx(0);
        setLoading(false);
      } catch (err) {
        // Aborts are expected (newer keystroke / overlay closed) — stay silent.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFailed(true);
        setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [q, open]);

  // Flatten results into a single keyboard-navigable list.
  const items: ResultItem[] = useMemo(() => {
    if (q.trim().length < 2) return QUICK_LINKS;
    if (!results) return [];
    const walletItems: ResultItem[] = results.wallets.map(w => ({
      kind: 'wallet',
      key: `wallet-${w.wallet}`,
      href: `/wallets/${w.wallet}`,
      primary: w.handle ? `@${w.handle}` : shortAddr(w.wallet),
      secondary: w.handle ? shortAddr(w.wallet) : undefined,
      trailing: `${w.net >= 0 ? '+' : ''}${abbrUsdStr(w.net)} · ${w.pulls} pulls`,
    }));
    const cardItems: ResultItem[] = results.cards.map(c => ({
      kind: 'card',
      key: `card-${c.slug}`,
      href: `/cards/${c.slug}`,
      primary: c.title ?? c.slug,
      secondary: [c.card_set, c.grading].filter(Boolean).join(' · ') || undefined,
      trailing: c.fmv != null ? `${abbrUsdStr(c.fmv)} · ${c.pulls}×` : `${c.pulls}×`,
      imageUrl: cardImageUrl(c.slug, c.image_front, 120),
    }));
    return [...walletItems, ...cardItems];
  }, [results, q]);

  // Keep the keyboard-highlighted row visible while arrowing through results.
  useEffect(() => {
    if (!open) return;
    const sel = items[selectedIdx];
    if (!sel) return;
    document.getElementById(optionId(sel.key))?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx, items, open]);

  // Keyboard handling (Esc / ↑ / ↓ / Enter). Bound to the input so it only
  // fires when the overlay has focus.
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, Math.max(0, items.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[selectedIdx];
      if (sel) {
        onClose();
        router.push(sel.href);
      }
    }
  }

  if (!open) return null;

  const hasQuery = q.trim().length >= 2;
  const showEmpty = hasQuery && !loading && !failed && items.length === 0;
  const activeId = items[selectedIdx] ? optionId(items[selectedIdx].key) : undefined;

  // Group results into Wallets / Cards (or single Quick links group for empty state).
  const walletGroup = items.filter(i => i.kind === 'wallet');
  const cardGroup = items.filter(i => i.kind === 'card');
  const navGroup = items.filter(i => i.kind === 'nav');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-12" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="mx-auto max-w-2xl"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line-soft)',
          maxHeight: 'calc(100dvh - 6rem)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header / input */}
        <div
          className="flex items-center gap-2.5 px-3 py-3"
          style={{ borderBottom: '1px solid var(--line-soft)' }}
        >
          <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.18em' }}>SEARCH</Mono>
          <input
            ref={ref}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="wallet handle, 0x…, card title, set, serial #"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="search-results"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-4)',
              padding: '1px 5px',
              border: '1px solid var(--line-soft)',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results — scrollable */}
        <div id="search-results" role="listbox" aria-label="Search results" style={{ overflowY: 'auto', flex: 1 }}>
          {!hasQuery && (
            <ResultGroup label="QUICK LINKS">
              {navGroup.map((item, i) => (
                <ResultRow
                  key={item.key}
                  item={item}
                  selected={i === selectedIdx}
                  onClose={onClose}
                />
              ))}
            </ResultGroup>
          )}

          {hasQuery && loading && items.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Mono style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
                SEARCHING…
              </Mono>
            </div>
          )}

          {hasQuery && failed && (
            <div className="px-4 py-6 text-center" role="status">
              <Mono style={{ fontSize: 10, color: 'var(--negative)', letterSpacing: '0.14em' }}>
                SEARCH FAILED — KEEP TYPING TO RETRY
              </Mono>
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-6 text-center">
              <Mono style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
                NO MATCHES FOR {q.toUpperCase()}
              </Mono>
            </div>
          )}

          {hasQuery && walletGroup.length > 0 && (
            <ResultGroup label={`WALLETS · ${walletGroup.length}`}>
              {walletGroup.map(item => (
                <ResultRow
                  key={item.key}
                  item={item}
                  selected={items.indexOf(item) === selectedIdx}
                  onClose={onClose}
                />
              ))}
            </ResultGroup>
          )}

          {hasQuery && cardGroup.length > 0 && (
            <ResultGroup label={`CARDS · ${cardGroup.length}`}>
              {cardGroup.map(item => (
                <ResultRow
                  key={item.key}
                  item={item}
                  selected={items.indexOf(item) === selectedIdx}
                  onClose={onClose}
                />
              ))}
            </ResultGroup>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid var(--line-soft)' }}
        >
          <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
            ↑↓ NAVIGATE · ↵ OPEN · ESC CLOSE
          </Mono>
          {hasQuery && results && (
            <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
              {items.length} {items.length === 1 ? 'RESULT' : 'RESULTS'}
            </Mono>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <div
        aria-hidden
        className="px-3 py-1.5"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.18em' }}>{label}</Mono>
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  item,
  selected,
  onClose,
}: {
  item: ResultItem;
  selected: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      id={optionId(item.key)}
      role="option"
      aria-selected={selected}
      className="grid items-center gap-2.5 px-3 py-2.5"
      style={{
        gridTemplateColumns: item.imageUrl ? '32px 1fr auto' : '1fr auto',
        background: selected ? 'var(--bg-3)' : 'transparent',
        borderLeft: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
        borderBottom: '1px dashed var(--line-soft)',
      }}
    >
      {item.imageUrl && (
        <CardThumb
          img={item.imageUrl}
          alt={item.primary}
          style={{ width: 32, border: '1px solid var(--line-soft)' }}
        />
      )}
      <div className="min-w-0">
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--fg)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.primary}
        </div>
        {item.secondary && (
          <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', marginTop: 2, display: 'block' }}>
            {item.secondary}
          </Mono>
        )}
      </div>
      {item.trailing && (
        <Mono style={{ fontSize: 10, color: 'var(--fg-3)' }}>{item.trailing}</Mono>
      )}
    </Link>
  );
}
