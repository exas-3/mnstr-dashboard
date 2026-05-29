'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Mono, SectionHead, StatusPill, TierTag, type Tier } from '../primitives';
import type { HitRow, Kpis } from '@/lib/queries';

// SSE is primary; this HTTP poll is a backstop in case the EventSource
// silently breaks (proxy reaped it, upstream restart, etc.). 5 min is short
// enough to self-heal quickly without doubling load on the API.
const POLL_MS = 5 * 60 * 1000;

interface LiveData {
  kpis: Kpis;
  feed: HitRow[];
  latestBlock: { block: number; tier: string } | null;
  serverNow: string;
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

const FEED_PAGE_STEP = 30;
// Hard cap on the feed. Sized to comfortably cover ~1 week of pulls at
// current ~700/day throughput, so consecutive Show-More clicks can walk back
// roughly a week before the button hides. Mirror this on the API side
// (app/api/live/route.ts:MAX_LIMIT) — they need to agree.
const FEED_MAX = 6000;

// Hover popover sizing — keep in sync with the inline render below.
const POPOVER_W = 360;
const POPOVER_OFFSET = 18;
const VIEWPORT_MARGIN = 8;

interface HoverState {
  idx: number;
  x: number;
  y: number;
}

export default function LivePulse({ initial, embed = false }: { initial: LiveData; embed?: boolean }) {
  const [data, setData] = useState<LiveData>(initial);
  const [tick, setTick] = useState(0);
  // `mounted` is false during SSR + initial client hydration so any
  // time-relative text (ago()) skips that pass and renders nothing — the
  // SSR HTML and the client hydration HTML are then byte-identical. Once
  // mounted flips true, the real "Xs ago" labels populate.
  const [mounted, setMounted] = useState(false);
  // Feed limit — start at the SSR'd count, bump by FEED_PAGE_STEP per
  // "Show more" click. Each poll re-fetches /api/live with this limit so
  // both new arrivals at the top and the expanded tail stay in sync.
  const [feedLimit, setFeedLimit] = useState(initial.feed.length);
  // Mirror feedLimit into a ref so the poll/SSE effect can read the current
  // limit without re-subscribing (and tearing down the EventSource) on every
  // "Show more" click.
  const feedLimitRef = useRef(feedLimit);
  feedLimitRef.current = feedLimit;
  // Cursor-following popover. Null when no card is hovered. Single state
  // for the whole grid — only one popover renders at a time. The 2xl:
  // breakpoint hides the popover on the largest screens where the inline
  // grid cells are already big enough to read.
  const [hover, setHover] = useState<HoverState | null>(null);

  function handleHoverMove(e: React.MouseEvent<HTMLDivElement>, idx: number) {
    // Estimate popover height for clamping (5:7 image + ~38px title row).
    const popW = Math.min(POPOVER_W, window.innerWidth - 2 * VIEWPORT_MARGIN);
    const popH = popW * (7 / 5) + 38;
    let x = e.clientX + POPOVER_OFFSET;
    let y = e.clientY + POPOVER_OFFSET;
    if (x + popW > window.innerWidth - VIEWPORT_MARGIN) {
      x = e.clientX - popW - POPOVER_OFFSET;
    }
    if (x < VIEWPORT_MARGIN) x = VIEWPORT_MARGIN;
    if (y + popH > window.innerHeight - VIEWPORT_MARGIN) {
      y = window.innerHeight - popH - VIEWPORT_MARGIN;
    }
    if (y < VIEWPORT_MARGIN) y = VIEWPORT_MARGIN;
    setHover({ idx, x, y });
  }
  function handleHoverLeave() {
    setHover(null);
  }

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/live?limit=${feedLimitRef.current}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as LiveData;
        if (!cancelled) setData(json);
      } catch {}
    }
    // Backstop HTTP poll — fires only if SSE goes dark.
    const id = window.setInterval(poll, POLL_MS);
    const tickId = window.setInterval(() => setTick(t => t + 1), 1000);
    // Primary push channel — server emits `pulls` whenever the indexer
    // inserts (or enriches) a pull. We refetch immediately so the new row
    // and updated KPIs show up within ~1s of chain confirmation.
    // EventSource auto-reconnects on transient errors.
    const es = new EventSource('/api/live/stream');
    const onPulls = () => poll();
    es.addEventListener('pulls', onPulls);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearInterval(tickId);
      es.removeEventListener('pulls', onPulls);
      es.close();
    };
  }, []);

  async function loadMoreFeed() {
    if (feedLimit >= FEED_MAX) return;
    const next = Math.min(FEED_MAX, feedLimit + FEED_PAGE_STEP);
    setFeedLimit(next);
    // Trigger an immediate fetch at the new limit instead of waiting for the
    // next backstop poll — the poll reads feedLimit via a ref now, so it
    // won't re-run on this state change.
    try {
      const res = await fetch(`/api/live?limit=${next}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as LiveData;
      setData(json);
    } catch {}
  }

  // Use `tick` so age-out strings re-render
  void tick;

  return (
    <div className="pb-6">
      {!embed && (
        <div
          className="mx-3 mt-3 flex items-center gap-3 px-3.5 py-3.5"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
        >
          <div className="relative" style={{ width: 14, height: 14 }}>
            <div
              style={{
                position: 'absolute',
                inset: 4,
                borderRadius: '50%',
                background: 'var(--positive)',
                boxShadow: '0 0 10px var(--positive)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid var(--positive)',
                opacity: 0.5,
              }}
            />
          </div>
          <div className="flex-1">
            <Mono style={{ fontSize: 11, color: 'var(--positive)', letterSpacing: '0.18em' }}>
              ● STREAM LIVE
            </Mono>
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2, display: 'block' }}>
              real-time push{mounted && ` · last ${ago(data.serverNow)} ago`}
              {data.latestBlock && ` · block ${data.latestBlock.block.toLocaleString('en-US')}`}
            </Mono>
          </div>
        </div>
      )}

      <SectionHead tag="STREAM" title="Latest pulls" right="NEWEST FIRST" />

      <div className="mx-3 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 sm:gap-3.5">
        {data.feed.map((it, idx) => {
          const fmv = Number(it.fmv_usd ?? 0);
          const who = it.username ? `@${it.username}` : shortAddr(it.wallet);
          const img = it.card_slug ? `/img/${it.card_slug}` : it.card_image_front;
          const cardImage = (
            <div
              style={{
                aspectRatio: '5/7',
                background: img
                  ? `center/contain no-repeat url("${img}"), var(--bg-3)`
                  : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
                border: `1px solid ${fmv >= 1000 ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
                position: 'relative',
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              {/* Price pill at the bottom — same style as CardWallTile so the
               * stream cards read consistently with the /cards wall. White
               * text on a 70%-bg overlay so it stays legible against any
               * card art. */}
              <Mono
                style={{
                  fontSize: 12,
                  color: 'var(--fg)',
                  background: 'color-mix(in oklch, var(--bg) 70%, transparent)',
                  padding: '1px 4px',
                  alignSelf: 'flex-start',
                }}
              >
                ${fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0)}
              </Mono>
            </div>
          );
          return (
            <div
              key={it.request_id}
              className="relative flex flex-col gap-1.5 p-2"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
              onMouseMove={img ? e => handleHoverMove(e, idx) : undefined}
              onMouseLeave={img ? handleHoverLeave : undefined}
            >
              {it.card_slug ? (
                <Link href={`/cards/${it.card_slug}`} className="block">
                  {cardImage}
                </Link>
              ) : (
                cardImage
              )}
              <div className="flex items-center justify-between">
                <Link
                  href={`/wallets/${it.wallet}`}
                  className="hover:underline"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 10, color: 'var(--fg)' }}
                >
                  {who}
                </Link>
                <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>{mounted ? ago(it.pulled_at) : ''}</Mono>
              </div>
              <div className="flex items-center justify-between">
                <TierTag tier={it.tier as Tier} style={{ padding: '1px 4px', fontSize: 7.5 }} />
                <StatusPill status={it.status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover preview — single popover for the whole grid, position follows
       * cursor with viewport-edge clamping. Hidden on 2xl+ where the grid
       * cells are large enough to read on their own. */}
      {hover && data.feed[hover.idx] && (() => {
        const it = data.feed[hover.idx];
        const fmv = Number(it.fmv_usd ?? 0);
        const img = it.card_slug ? `/img/${it.card_slug}` : it.card_image_front;
        if (!img) return null;
        return (
          <div
            className="pointer-events-none fixed z-50 2xl:hidden"
            style={{
              left: hover.x,
              top: hover.y,
              width: `min(${POPOVER_W}px, calc(100vw - ${2 * VIEWPORT_MARGIN}px))`,
            }}
          >
            <div
              style={{
                aspectRatio: '5/7',
                background: `center/contain no-repeat url("${img}"), var(--bg-3)`,
                border: `1px solid ${fmv >= 1000 ? 'var(--accent)' : 'var(--line)'}`,
                boxShadow:
                  '0 16px 50px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklch, var(--accent) 10%, transparent)',
              }}
            />
            <div
              className="mt-1.5 px-2 py-1.5 flex items-center justify-between"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
            >
              <Mono
                style={{
                  fontSize: 9.5,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {it.card_title ?? 'unknown card'}
              </Mono>
              <Mono style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 8 }}>
                ${fmv.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Mono>
            </div>
          </div>
        );
      })()}

      {/* Hide the button once we've hit the FEED_MAX cap OR the API has run
       * out of rows (returned fewer than we asked for). */}
      {feedLimit < FEED_MAX && data.feed.length >= feedLimit && (
        <div className="px-4 pt-3 pb-1 text-center">
          <button
            type="button"
            onClick={loadMoreFeed}
            style={{
              padding: '8px 16px',
              color: 'var(--accent)',
              border: '1px solid color-mix(in oklch, var(--accent) 33%, transparent)',
              background: 'color-mix(in oklch, var(--accent) 5%, transparent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              cursor: 'pointer',
            }}
          >
            SHOW MORE
          </button>
        </div>
      )}

      {!embed && (
        <div
          className="mt-6 px-4 pt-4 pb-2"
          style={{ borderTop: '1px dashed var(--line-soft)' }}
        >
          <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
            † Big hits (≥$1k FMV) are bordered in amber.
          </Mono>
        </div>
      )}
    </div>
  );
}
