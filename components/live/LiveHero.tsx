'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import type { HitRow } from '@/lib/queries';

const BIG_HIT_USD = 1000;
const FLASH_MS = 1100;
const PIN_MS = 30_000;

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export default function LiveHero({ pull }: { pull: HitRow | null }) {
  const [flash, setFlash] = useState(false);
  const [pinned, setPinned] = useState<HitRow | null>(null);
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!pull) return;
    if (prevId.current === null) {
      prevId.current = pull.request_id;
      return;
    }
    if (pull.request_id !== prevId.current) {
      prevId.current = pull.request_id;
      // Trigger amber flash on new arrival
      setFlash(true);
      const fid = window.setTimeout(() => setFlash(false), FLASH_MS);
      // Pin if ≥ $1k FMV
      const fmv = Number(pull.fmv_usd ?? 0);
      if (fmv >= BIG_HIT_USD) {
        setPinned(pull);
        const pid = window.setTimeout(() => setPinned(null), PIN_MS);
        return () => {
          window.clearTimeout(fid);
          window.clearTimeout(pid);
        };
      }
      return () => window.clearTimeout(fid);
    }
  }, [pull]);

  const shown = pinned ?? pull;
  if (!shown) {
    return (
      <div
        className="mx-3 my-3 px-3 py-8 text-center"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>WAITING FOR FIRST PULL</Mono>
      </div>
    );
  }

  const who = shown.username ? `@${shown.username}` : shortAddr(shown.wallet);
  const isBig = Number(shown.fmv_usd ?? 0) >= BIG_HIT_USD;
  const payout = shown.payout_usd ? Number(shown.payout_usd) : null;
  const value = payout ?? Number(shown.fmv_usd ?? 0);

  return (
    <div className="px-3" key={shown.request_id}>
      <div
        className="grid p-2.5"
        style={{
          gridTemplateColumns: '110px 1fr',
          gap: 12,
          background: 'var(--bg-2)',
          border: `1px solid ${flash || isBig ? 'var(--accent)' : 'var(--line-soft)'}`,
          boxShadow: flash
            ? '0 0 0 1px color-mix(in oklch, var(--accent) 33%, transparent), 0 0 24px color-mix(in oklch, var(--accent) 23%, transparent)'
            : 'none',
          transition: 'box-shadow 200ms, border-color 200ms',
        }}
      >
        {(() => {
          const img = shown.card_slug ? `/img/${shown.card_slug}` : shown.card_image_front;
          const thumb = (
            <div
              style={{
                aspectRatio: '5/7',
                background: img
                  ? `center/contain no-repeat url("${img}")`
                  : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)',
                border: `1px solid ${isBig ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
                boxShadow: isBig
                  ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 0 22px color-mix(in oklch, var(--accent) 12%, transparent)'
                  : 'none',
              }}
            />
          );
          return shown.card_slug ? (
            <Link href={`/cards/${shown.card_slug}`}>{thumb}</Link>
          ) : (
            thumb
          );
        })()}
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.16em' }}>
              {pinned ? '★ PINNED · BIG HIT' : '● NOW'} · {ago(shown.pulled_at)}
            </Mono>
            {shown.card_slug ? (
              <Link
                href={`/cards/${shown.card_slug}`}
                className="hover:underline"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--fg)',
                  marginTop: 6,
                  lineHeight: 1.25,
                  display: 'block',
                }}
              >
                {shown.card_title ?? `Pull #${shown.request_id.slice(0, 8)}`}
              </Link>
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--fg)',
                  marginTop: 6,
                  lineHeight: 1.25,
                }}
              >
                {shown.card_title ?? `Pull #${shown.request_id.slice(0, 8)}`}
              </div>
            )}
            {shown.card_set && (
              <Mono style={{ fontSize: 9.5, color: 'var(--fg-3)', marginTop: 4, display: 'block' }}>
                {shown.card_set}
              </Mono>
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <Link
                href={`/wallets/${shown.wallet}`}
                className="hover:underline"
                style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--fg)' }}
              >
                {who}
              </Link>
              <TierTag tier={shown.tier as Tier} />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <StatusPill status={shown.status} />
              <Mono style={{ fontSize: 14, color: 'var(--accent)' }}>
                {payout !== null && shown.status === 'sold_back' ? '+' : ''}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Mono>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
