import { Lbl, Mono } from '../primitives';
import type { WalletRhythmPoint } from '@/lib/queries';

export default function WalletRhythm({
  data,
  weeks = 12,
}: {
  data: WalletRhythmPoint[];
  weeks?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS IN WINDOW</Mono>
        </div>
      </div>
    );
  }

  // Fill missing weeks with zeros so the bar layout is stable.
  const buckets: WalletRhythmPoint[] = [];
  if (data.length > 0) {
    const last = new Date(data[data.length - 1].bucket);
    for (let i = weeks - 1; i >= 0; i--) {
      const ms = last.getTime() - i * 7 * 24 * 60 * 60 * 1000;
      const iso = new Date(ms).toISOString().slice(0, 10);
      const found = data.find(d => d.bucket === iso);
      buckets.push(found ?? { bucket: iso, pulls: 0, bigHit: false });
    }
  }

  const W = 360;
  const H = 120;
  const peak = Math.max(...buckets.map(b => b.pulls), 1);
  const gap = 4;
  const barW = (W - (buckets.length - 1) * gap) / buckets.length;

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="px-3 pt-2.5 pb-1">
        <Lbl>Pull rhythm · {weeks}wk</Lbl>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        {[0.5, 1].map(y => (
          <line
            key={y}
            x1="0"
            y1={H - y * (H - 22)}
            x2={W}
            y2={H - y * (H - 22)}
            stroke="var(--line-soft)"
            strokeDasharray="2 4"
          />
        ))}
        {buckets.map((b, i) => {
          const x = i * (barW + gap);
          const h = (b.pulls / peak) * (H - 24);
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - h - 4}
                width={Math.max(2, barW)}
                height={Math.max(0, h)}
                fill={b.bigHit ? 'var(--accent)' : 'var(--fg-3)'}
                opacity={b.pulls > 0 ? 0.85 : 0.2}
              >
                <title>
                  {b.bucket}: {b.pulls} pulls{b.bigHit ? ' (big hit)' : ''}
                </title>
              </rect>
              {b.bigHit && (
                <text
                  x={x + barW / 2}
                  y={H - h - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--accent)"
                >
                  ★
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-3 pb-2.5">
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>−{weeks}wk</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>NOW</Mono>
      </div>
    </div>
  );
}
