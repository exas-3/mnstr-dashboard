import { Mono, TierTag, type Tier } from '../primitives';
import type { TierStats } from '@/lib/queries';

const COLOR: Record<string, string> = {
  Starter: 'var(--tier-blue)',
  Premium: 'var(--accent)',
  Ultra:   'var(--tier-magenta)',
};

export default function TierStrip({ stats }: { stats: TierStats[] }) {
  const peak = Math.max(...stats.map(s => s.pulls), 1);
  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      {stats.map((t, i) => {
        const c = COLOR[t.tier] ?? 'var(--fg)';
        const barPct = Math.max(2, Math.round((t.pulls / peak) * 100));
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
                  {t.pulls.toLocaleString('en-US')} pulls
                </Mono>
                <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
                  EV ${t.evUsd.toFixed(t.evUsd < 100 ? 2 : 0)}
                </Mono>
              </div>
            </div>
            <Mono style={{ fontSize: 11, color: 'var(--accent)', textAlign: 'right' }}>
              {(t.edge * 100).toFixed(1)}%
            </Mono>
          </div>
        );
      })}
    </div>
  );
}
