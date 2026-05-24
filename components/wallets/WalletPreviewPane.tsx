import Link from 'next/link';
import { Identicon, Lbl, Mono } from '../primitives';
import type { WalletRow } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

/* Full-precision integer dollars with thousands separators ($10,642 / -$50).
 * Matches the leaderboard rows next to it — keeps scanning the spotlight + the
 * list visually consistent. */
function usdInt(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

/* Sticky desktop-only preview pane that puts a face on the leaderboard:
 *   - The current #1 wallet (rank, handle, net P&L, spend, pulls)
 *   - A compact "podium" with #2 and #3
 *   - "OPEN PROFILE" CTA into the wallet detail page
 *
 * Designed as a master-detail right column. Hidden below xl. */
export default function WalletPreviewPane({ rows }: { rows: WalletRow[] }) {
  const top = rows[0];
  const second = rows[1];
  const third = rows[2];

  if (!top) return null;

  const isPos = top.net >= 0;
  const pnlColor = isPos ? 'var(--positive)' : 'var(--tier-magenta)';
  const handle = top.handle ?? shortAddr(top.wallet);

  return (
    <aside
      className="hidden md:block"
      style={{
        position: 'sticky',
        top: 64,
        alignSelf: 'start',
      }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line-soft)',
          padding: 14,
        }}
      >
        <Lbl style={{ fontSize: 8.5 }}>RANK 01 · SPOTLIGHT</Lbl>
        <div className="mt-3 flex items-center gap-3">
          <Identicon addr={top.wallet} size={40} />
          <div className="min-w-0 flex-1">
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                color: 'var(--fg)',
                fontWeight: 500,
              }}
            >
              {handle}
            </div>
            {top.handle && (
              <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', marginTop: 1, display: 'block' }}>
                {shortAddr(top.wallet)}
              </Mono>
            )}
          </div>
        </div>

        <Mono
          style={{
            marginTop: 14,
            display: 'block',
            fontSize: 28,
            color: pnlColor,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {isPos ? '+' : ''}
          {usdInt(top.net)}
        </Mono>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', marginTop: 4, display: 'block' }}>
          NET P&L
        </Mono>

        <div className="mt-4 grid grid-cols-2 gap-2" style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 10 }}>
          <Stat label="SPEND" value={usdInt(top.spend)} />
          <Stat label="PULLS" value={top.pulls.toLocaleString('en-US')} />
        </div>

        <Link
          href={`/wallets/${top.wallet}`}
          className="mt-4 block text-center"
          style={{
            padding: '8px 12px',
            background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
          }}
        >
          OPEN PROFILE →
        </Link>
      </div>

      {(second || third) && (
        <div
          className="mt-2"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line-soft)',
            padding: 12,
          }}
        >
          <Lbl style={{ fontSize: 8.5 }}>RUNNERS-UP</Lbl>
          <div className="mt-2 grid gap-2">
            {[second, third].filter(Boolean).map(r => {
              const row = r!;
              const pos = row.net >= 0;
              const c = pos ? 'var(--positive)' : 'var(--tier-magenta)';
              const name = row.handle ?? shortAddr(row.wallet);
              return (
                <Link
                  key={row.wallet}
                  href={`/wallets/${row.wallet}`}
                  className="flex items-center gap-2"
                >
                  <Mono style={{ fontSize: 10, color: 'var(--fg-4)', width: 22 }}>
                    {String(row.rank).padStart(2, '0')}
                  </Mono>
                  <Identicon addr={row.wallet} size={22} />
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--fg-2)',
                    }}
                  >
                    {name}
                  </span>
                  <Mono style={{ fontSize: 11, color: c }}>
                    {pos ? '+' : ''}
                    {usdInt(row.net)}
                  </Mono>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>{label}</Mono>
      <Mono style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 2, display: 'block' }}>{value}</Mono>
    </div>
  );
}
