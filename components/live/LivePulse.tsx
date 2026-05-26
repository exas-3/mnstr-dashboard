'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { KpiTile, Mono, SectionHead, StatusPill, TierTag, type Tier } from '../primitives';
import type { HitRow, Kpis } from '@/lib/queries';

const POLL_MS = 5000;

interface LiveData {
  kpis: Kpis;
  feed: HitRow[];
  latestBlock: { block: number; tier: string } | null;
  serverNow: string;
}

function abbrUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
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

export default function LivePulse({ initial, embed = false }: { initial: LiveData; embed?: boolean }) {
  const [data, setData] = useState<LiveData>(initial);
  const [tick, setTick] = useState(0);
  // `mounted` is false during SSR + initial client hydration so any
  // time-relative text (ago()) skips that pass and renders nothing — the
  // SSR HTML and the client hydration HTML are then byte-identical. Once
  // mounted flips true, the real "Xs ago" labels populate.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as LiveData;
        if (!cancelled) setData(json);
      } catch {}
    }
    const id = window.setInterval(poll, POLL_MS);
    const tickId = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearInterval(tickId);
    };
  }, []);

  // Use `tick` so age-out strings re-render
  void tick;
  const big = data.feed.filter(p => Number(p.fmv_usd ?? 0) >= 1000).length;

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
              polling every {POLL_MS / 1000}s{mounted && ` · last ${ago(data.serverNow)} ago`}
              {data.latestBlock && ` · block ${data.latestBlock.block.toLocaleString('en-US')}`}
            </Mono>
          </div>
        </div>
      )}

      <SectionHead tag="WINDOW · 24H" title="Right now" />
      <div className="mx-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <KpiTile label="Packs" value={data.kpis.packs.toLocaleString('en-US')} />
        <KpiTile label="USDm" value={abbrUsd(data.kpis.usdmCycledUsd)} />
        <KpiTile label="Paid out" value={abbrUsd(data.kpis.payoutUsd)} />
        <KpiTile label="Big hits" value={String(big)} />
      </div>

      <SectionHead tag="STREAM" title="Latest pulls" right="NEWEST FIRST" />

      <div className="mx-3 mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {data.feed.map(it => {
          const fmv = Number(it.fmv_usd ?? 0);
          const who = it.username ? `@${it.username}` : shortAddr(it.wallet);
          const img = it.card_slug ? `/img/${it.card_slug}` : it.card_image_front;
          const cardImage = (
            <div
              style={{
                aspectRatio: '5/7',
                background: img
                  ? `center/contain no-repeat url("${img}")`
                  : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
                border: `1px solid ${fmv >= 1000 ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
                position: 'relative',
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Mono style={{ fontSize: 8.5, color: 'var(--accent)', letterSpacing: '0.1em' }}>
                ${fmv.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Mono>
            </div>
          );
          return (
            <div
              key={it.request_id}
              className="group relative flex flex-col gap-1.5 p-2"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
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

              {/* Hover preview — visible only below 2xl, where the inline grid
               * cells are small. CSS-only via group-hover; pointer-events-none
               * so cursor stays in the underlying card and the popover doesn't
               * flicker as the cursor crosses its bounds. */}
              {img && (
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 z-50 hidden -translate-x-1/2 -translate-y-1/2 group-hover:block 2xl:!hidden"
                  style={{ width: 360 }}
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
              )}
            </div>
          );
        })}
      </div>

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
