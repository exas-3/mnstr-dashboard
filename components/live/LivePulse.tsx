'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Mono, SectionHead, StatusPill, TierTag, type Tier } from '../primitives';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { HitRow, Kpis } from '@/lib/queries';
import { LIVE_FEED_MAX } from '@/lib/constants';
import { agoShort, shortAddr } from '@/lib/format';

// SSE is primary; this HTTP poll is a backstop in case the EventSource
// silently breaks (proxy reaped it, upstream restart, etc.). 5 min is short
// enough to self-heal quickly without doubling load on the API.
const POLL_MS = 5 * 60 * 1000;
// Floor between SSE-triggered refetches. The server already coalesces
// pulls events per connection, but indexer bursts can still push more often
// than a feed needs to repaint — trailing throttle so the last event of a
// burst still lands.
const MIN_FETCH_GAP_MS = 3_000;

interface LiveData {
  kpis: Kpis;
  feed: HitRow[];
  latestBlock: { block: number; tier: string } | null;
  serverNow: string;
  // Poller heartbeat (indexer_state.last_poll_ok) — advanced only by a fully-
  // successful reconcile. Null when the key doesn't exist yet.
  lastPollOk?: string | null;
}

// Staleness thresholds: reconcile cadence is 5 min, so 15 min = 3 missed
// cycles (amber), 60 min = properly wedged (gray).
const STALE_MS = 15 * 60 * 1000;
const OFFLINE_MS = 60 * 60 * 1000;

/* ONE shared 1s ticker for every per-second label on the page. Each AgoLabel
 * leaf subscribes and re-renders alone — the feed grid (up to FEED_MAX
 * memoized tiles) no longer repaints every second just to advance "12s" to
 * "13s". */
const tickListeners = new Set<() => void>();
let tickerId: number | null = null;
function subscribeTick(cb: () => void): () => void {
  tickListeners.add(cb);
  if (tickerId === null) {
    tickerId = window.setInterval(() => tickListeners.forEach(fn => fn()), 1000);
  }
  return () => {
    tickListeners.delete(cb);
    if (tickListeners.size === 0 && tickerId !== null) {
      window.clearInterval(tickerId);
      tickerId = null;
    }
  };
}

/* Self-ticking relative-time label. Renders empty until mounted (same
 * hydration-safety convention as the rest of the codebase). */
function AgoLabel({ iso, style }: { iso: string; style?: React.CSSProperties }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    return subscribeTick(() => setNow(Date.now()));
  }, []);
  return <Mono style={style}>{now !== null ? agoShort(iso) : ''}</Mono>;
}

const FEED_PAGE_STEP = 30;
// Hard cap on the feed — shared with /api/live's limit clamp via
// lib/constants so the two can't drift.
const FEED_MAX = LIVE_FEED_MAX;

// Hover popover sizing — keep in sync with the inline render below.
const POPOVER_W = 360;
const POPOVER_OFFSET = 18;
const VIEWPORT_MARGIN = 8;

interface HoverState {
  idx: number;
  x: number;
  y: number;
}

/* One feed cell. Memoized: the parent re-renders on every hover move and
 * every data refetch, but a tile only actually re-renders when its own row
 * object changes. The per-second time label is the self-ticking AgoLabel
 * leaf, so ticking never touches the tile itself. */
const FeedTile = memo(function FeedTile({
  it,
  idx,
  onMove,
  onLeave,
}: {
  it: HitRow;
  idx: number;
  onMove: (e: React.MouseEvent<HTMLDivElement>, idx: number) => void;
  onLeave: () => void;
}) {
  const fmv = Number(it.fmv_usd ?? 0);
  const who = it.username ? `@${it.username}` : shortAddr(it.wallet);
  const img = cardImageUrl(it.card_slug, it.card_image_front, 240);
  const cardImage = (
    <CardThumb
      img={img}
      alt={it.card_title}
      className="flex flex-col justify-end"
      style={{
        border: `1px solid ${fmv >= 1000 ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
        padding: 6,
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
    </CardThumb>
  );
  return (
    <div
      className="relative flex flex-col gap-1.5 p-2"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      onMouseMove={img ? e => onMove(e, idx) : undefined}
      onMouseLeave={img ? onLeave : undefined}
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
        <AgoLabel iso={it.pulled_at} style={{ fontSize: 8.5, color: 'var(--fg-4)' }} />
      </div>
      <div className="flex items-center justify-between">
        <TierTag tier={it.tier as Tier} style={{ padding: '1px 4px', fontSize: 7.5 }} />
        <StatusPill status={it.status} />
      </div>
    </div>
  );
});

/* Status header (standalone) / stale banner (embed). Self-ticking so the
 * freshness math and the "last Xs ago" line update every second without
 * re-rendering the feed. Freshness: pollerLag is measured entirely in server
 * time (serverNow vs lastPollOk in the same payload — immune to client-clock
 * skew), aged forward by how long ago we received that payload
 * (client-measured interval). If the heartbeat key is absent, falls back to
 * payload age alone (still catches "server unreachable"). */
function StreamStatus({
  data,
  embed,
  lastFetchOkAtRef,
}: {
  data: LiveData;
  embed: boolean;
  lastFetchOkAtRef: React.RefObject<number | null>;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    return subscribeTick(() => setNow(Date.now()));
  }, []);
  const mounted = now !== null;

  const dataAgeMs = mounted && lastFetchOkAtRef.current != null ? now - lastFetchOkAtRef.current : 0;
  const pollerLagMs = data.lastPollOk
    ? Math.max(0, Date.parse(data.serverNow) - Date.parse(data.lastPollOk))
    : null;
  const staleMs = (pollerLagMs ?? 0) + dataAgeMs;
  const freshness: 'live' | 'stale' | 'offline' =
    !mounted || staleMs <= STALE_MS ? 'live' : staleMs <= OFFLINE_MS ? 'stale' : 'offline';
  const freshColor =
    freshness === 'live' ? 'var(--positive)' : freshness === 'stale' ? 'var(--accent)' : 'var(--fg-4)';
  const staleLabel = () => {
    const m = Math.round(staleMs / 60_000);
    return m < 90 ? `${m}m` : `${Math.round(m / 60)}h`;
  };

  if (embed) {
    // Embed mode has no status header — surface staleness as a slim banner
    // only when something is actually wrong, so the healthy view is
    // unchanged (OBS embeds included).
    if (freshness === 'live') return null;
    return (
      <div
        className="mx-3 mt-3 flex items-center gap-2 px-3 py-2"
        style={{ background: 'var(--bg-2)', border: `1px solid ${freshColor}` }}
      >
        <span className="live-dot" style={{ background: freshColor, animation: 'none' }} />
        <Mono style={{ fontSize: 10, color: freshColor, letterSpacing: '0.14em' }}>
          {freshness === 'stale' ? 'FEED STALE' : 'FEED OFFLINE'} · last update {staleLabel()} ago
        </Mono>
      </div>
    );
  }

  return (
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
            background: freshColor,
            boxShadow: freshness === 'live' ? '0 0 10px var(--positive)' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1px solid ${freshColor}`,
            opacity: 0.5,
          }}
        />
      </div>
      <div className="flex-1">
        <Mono style={{ fontSize: 11, color: freshColor, letterSpacing: '0.18em' }}>
          {freshness === 'live' ? '● STREAM LIVE' : freshness === 'stale' ? '● FEED STALE' : '● FEED OFFLINE'}
        </Mono>
        <Mono style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2, display: 'block' }}>
          {freshness === 'live' ? 'real-time push' : `indexer delayed · last update ${staleLabel()} ago`}
          {mounted && freshness === 'live' && ` · last ${agoShort(data.serverNow)} ago`}
          {data.latestBlock && ` · block ${data.latestBlock.block.toLocaleString('en-US')}`}
        </Mono>
      </div>
    </div>
  );
}

export default function LivePulse({ initial, embed = false }: { initial: LiveData; embed?: boolean }) {
  const [data, setData] = useState<LiveData>(initial);
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

  // Stable identity so the memoized FeedTile props don't change per render.
  const handleHoverMove = useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
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
  }, []);
  const handleHoverLeave = useCallback(() => setHover(null), []);

  // When the current `data` payload was received (client clock). Combined
  // with the payload's own serverNow/lastPollOk (server clock) this gives a
  // skew-free estimate of how stale the pipeline is right now (StreamStatus).
  const lastFetchOkAtRef = useRef<number | null>(null);

  useEffect(() => {
    lastFetchOkAtRef.current = Date.now(); // SSR payload was just delivered
    let cancelled = false;
    let inFlight = false;
    let lastFetch = 0;
    let throttleTimer: number | null = null;
    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/live?limit=${feedLimitRef.current}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as LiveData;
        if (!cancelled) {
          lastFetchOkAtRef.current = Date.now();
          setData(json);
        }
      } catch {
      } finally {
        inFlight = false;
      }
    }
    // Trailing throttle for SSE pushes — bursts collapse into one refetch
    // every MIN_FETCH_GAP_MS instead of one per event.
    function schedulePoll() {
      if (throttleTimer !== null) return;
      const wait = Math.max(0, lastFetch + MIN_FETCH_GAP_MS - Date.now());
      throttleTimer = window.setTimeout(() => {
        throttleTimer = null;
        lastFetch = Date.now();
        void poll();
      }, wait);
    }
    // Backstop HTTP poll — fires only if SSE goes dark.
    const id = window.setInterval(poll, POLL_MS);
    // Primary push channel — server emits `pulls` whenever the indexer
    // inserts (or enriches) a pull. We refetch promptly so the new row
    // and updated KPIs show up within seconds of chain confirmation.
    // EventSource auto-reconnects on transient errors.
    const es = new EventSource('/api/live/stream');
    const onPulls = () => schedulePoll();
    es.addEventListener('pulls', onPulls);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (throttleTimer !== null) window.clearTimeout(throttleTimer);
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

  return (
    <div className="pb-6">
      <StreamStatus data={data} embed={embed} lastFetchOkAtRef={lastFetchOkAtRef} />

      <SectionHead tag="STREAM" title="Latest pulls" right="NEWEST FIRST" />

      <div className="mx-3 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 sm:gap-3.5">
        {data.feed.map((it, idx) => (
          <FeedTile
            key={it.request_id}
            it={it}
            idx={idx}
            onMove={handleHoverMove}
            onLeave={handleHoverLeave}
          />
        ))}
      </div>

      {/* Hover preview — single popover for the whole grid, position follows
       * cursor with viewport-edge clamping. Hidden on 2xl+ where the grid
       * cells are large enough to read on their own. */}
      {hover && data.feed[hover.idx] && (() => {
        const it = data.feed[hover.idx];
        const fmv = Number(it.fmv_usd ?? 0);
        const img = cardImageUrl(it.card_slug, it.card_image_front, 480);
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
            † $1k+ FMV pulls are bordered in amber.
          </Mono>
        </div>
      )}
    </div>
  );
}
