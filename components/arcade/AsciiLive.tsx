'use client';

/* Arcade-themed Live route. Same 5s polling against /api/live as the Foil
 * variant, different chrome: ASCII boxes, terminal stream log feel. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AsciiBox, AsciiCaveat, AsciiKpi, AsciiStatus, AsciiTier } from './primitives';
import type { HitRow, Kpis } from '@/lib/queries';

const POLL_MS = 5000;
const BIG_HIT_USD = 1000;

interface LiveData {
  kpis: Kpis;
  feed: HitRow[];
  latestBlock: { block: number; tier: string } | null;
  serverNow: string;
}

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `T-${String(s).padStart(3, '0')}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `T-${String(m).padStart(2, '0')}m`;
  return `T-${String(Math.round(m / 60)).padStart(2, '0')}h`;
}

function abbrUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function asciiSlug(s: string | null): string {
  if (!s) return 'unknown';
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
}

export default function AsciiLive({ initial, embed = false }: { initial: LiveData; embed?: boolean }) {
  const [data, setData] = useState<LiveData>(initial);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as LiveData;
        if (!cancelled) setData(json);
      } catch {}
    }
    const poller = window.setInterval(poll, POLL_MS);
    const ticker = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(poller);
      window.clearInterval(ticker);
    };
  }, []);

  const newest = data.feed[0] ?? null;
  const rest = data.feed.slice(1);
  const bigCount = data.feed.filter(p => Number(p.fmv_usd ?? 0) >= BIG_HIT_USD).length;

  return (
    <div className="pb-6" style={{ fontFamily: 'var(--font-mono)' }}>
      {!embed && (
        <div
          className="mx-3.5 mt-3.5 flex items-center gap-3 px-3 py-2.5"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--accent)',
            boxShadow:
              '0 0 0 1px color-mix(in oklch, var(--accent) 20%, transparent), inset 0 0 16px color-mix(in oklch, var(--accent) 7%, transparent)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)',
            }}
          />
          <div className="flex-1">
            <div
              style={{
                color: 'var(--accent)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textShadow: '0 0 6px color-mix(in oklch, var(--accent) 40%, transparent)',
              }}
            >
              ● STREAM.LIVE
            </div>
            <div style={{ color: 'var(--fg-4)', fontSize: 9.5, marginTop: 2 }}>
              poll T+{POLL_MS / 1000}s :: last {ago(data.serverNow)}{' '}
              {data.latestBlock && `:: block ${data.latestBlock.block.toLocaleString('en-US')}`}
            </div>
          </div>
        </div>
      )}

      {/* 24H window KPIs */}
      <div className="grid gap-1.5 px-3.5 pt-3 grid-cols-2 sm:grid-cols-4">
        <AsciiKpi label="PKS.24H" value={data.kpis.packs.toLocaleString('en-US')} />
        <AsciiKpi label="USDM" value={abbrUsd(data.kpis.usdmCycledUsd)} />
        <AsciiKpi label="PAID" value={abbrUsd(data.kpis.payoutUsd)} />
        <AsciiKpi label="HITS" value={String(bigCount)} />
      </div>

      {/* Newest pull hero */}
      <AsciiBox title="NOW" glow>
        {newest ? (
          <div className="grid items-baseline gap-2" style={{ gridTemplateColumns: '1fr auto' }}>
            <div>
              <div style={{ color: 'var(--accent)', fontSize: 10, letterSpacing: '0.18em' }}>
                ● {ago(newest.pulled_at)}
              </div>
              {newest.card_slug ? (
                <Link
                  href={`/cards/${newest.card_slug}`}
                  className="hover:underline"
                  style={{ color: 'var(--fg)', fontSize: 13, marginTop: 6, display: 'block' }}
                >
                  {asciiSlug(newest.card_title)}
                </Link>
              ) : (
                <div style={{ color: 'var(--fg)', fontSize: 13, marginTop: 6 }}>
                  {asciiSlug(newest.card_title)}
                </div>
              )}
              {newest.card_set && (
                <div style={{ color: 'var(--fg-4)', fontSize: 10, marginTop: 4 }}>
                  {asciiSlug(newest.card_set)}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href={`/wallets/${newest.wallet}`}
                  className="hover:underline"
                  style={{ color: 'var(--fg)', fontSize: 11 }}
                >
                  {newest.username ? `@${newest.username}` : shortAddr(newest.wallet)}
                </Link>
                <AsciiTier tier={newest.tier as 'Starter' | 'Premium' | 'Ultra'} />
                <AsciiStatus status={newest.status} />
              </div>
            </div>
            <div style={{ color: 'var(--accent)', fontSize: 18, textAlign: 'right' }}>
              {newest.payout_usd !== null && newest.status === 'sold_back' ? '+' : ''}$
              {Math.round(Number(newest.payout_usd ?? newest.fmv_usd ?? 0)).toLocaleString('en-US')}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--fg-4)', fontSize: 10 }}>WAITING FOR FIRST PULL...</div>
        )}
      </AsciiBox>

      {/* Stream log */}
      <AsciiBox title="STREAM.LOG" right={`n=${data.feed.length}`}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.7 }}>
          {rest.map(p => {
            const big = Number(p.fmv_usd ?? 0) >= BIG_HIT_USD;
            const who = p.username ? `@${p.username}` : shortAddr(p.wallet);
            const action = p.status === 'sold_back' ? 'SOLD' : 'HOLD';
            const value =
              p.status === 'sold_back' && p.payout_usd
                ? `+$${Math.round(Number(p.payout_usd)).toLocaleString('en-US')}`
                : `$${Math.round(Number(p.fmv_usd ?? 0)).toLocaleString('en-US')}`;
            const tierCode = p.tier === 'Starter' ? 'STA' : p.tier === 'Premium' ? 'MON' : 'ULT';
            return (
              <div
                key={p.request_id}
                className="whitespace-pre"
                style={{
                  color: big ? 'var(--accent)' : 'var(--fg-2)',
                  textShadow: big
                    ? '0 0 6px color-mix(in oklch, var(--accent) 53%, transparent)'
                    : 'none',
                }}
              >
                <span style={{ color: 'var(--fg-4)' }}>[{ago(p.pulled_at).padEnd(6)}]</span>{' '}
                <span style={{ color: 'var(--fg-3)' }}>{tierCode}</span>{' '}
                <Link href={`/wallets/${p.wallet}`} className="hover:underline">
                  {who.padEnd(20).slice(0, 20)}
                </Link>{' '}
                <span style={{ color: action === 'SOLD' ? 'var(--negative)' : 'var(--accent)' }}>
                  {action}
                </span>{' '}
                <span style={{ color: big ? 'var(--accent)' : 'var(--fg)' }}>{value}</span>
              </div>
            );
          })}
        </div>
      </AsciiBox>

      {!embed && (
        <AsciiCaveat
          lines={['big hits (≥$1K FMV) glow & flag in the log.']}
        />
      )}
    </div>
  );
}
