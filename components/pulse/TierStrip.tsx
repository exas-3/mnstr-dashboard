import { Mono, TierTag, type Tier } from '../primitives';
import type { TierStats } from '@/lib/queries';

const COLOR: Record<string, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
};

function abbrUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function TierStrip({ stats }: { stats: TierStats[] }) {
  // Bars weight by USD volume (pulls × pack price), not raw pull count, so
  // low-count high-price tiers (Adventure $150, Ultra $1250) get visual
  // weight proportional to their actual revenue contribution.
  const peak = Math.max(...stats.map(s => s.pulls * s.price), 1);
  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      {stats.map((t, i) => {
        const c = COLOR[t.tier] ?? 'var(--fg)';
        const volume = t.pulls * t.price;
        const barPct = Math.max(2, Math.round((volume / peak) * 100));
        return (
          <div
            key={t.tier}
            className="grid items-center gap-3 px-3 py-2.5"
            style={{
              gridTemplateColumns: '78px 1fr 60px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            <div>
              <TierTag tier={t.tier as Tier} />
              <Mono style={{ fontSize: 11, color: 'var(--fg)', marginTop: 5, display: 'block' }}>
                ${t.price.toLocaleString('en-US')}
              </Mono>
            </div>
            <div>
              <div style={{ height: 3, background: 'var(--bg-3)', position: 'relative' }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: c }} />
              </div>
              <div className="mt-1 flex justify-between">
                <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
                  {abbrUsd(volume)} vol · {t.pulls.toLocaleString('en-US')} pulls
                </Mono>
                <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
                  EV ${t.evUsd.toFixed(t.evUsd < 100 ? 2 : 0)}
                </Mono>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Mono
                style={{
                  fontSize: 11,
                  color: t.edge <= 0 ? 'var(--positive)' : 'var(--tier-magenta)',
                  display: 'block',
                }}
              >
                {t.edge <= 0 ? '+' : '−'}{Math.abs(t.edge * 100).toFixed(1)}%
              </Mono>
              <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
                PLAYER EV
              </Mono>
            </div>
          </div>
        );
      })}
    </div>
  );
}
