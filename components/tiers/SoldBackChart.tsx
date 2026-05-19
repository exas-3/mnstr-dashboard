import { Lbl, Mono } from '../primitives';
import type { SoldBackPoint } from '@/lib/queries';

export default function SoldBackChart({ data, weeks = 12 }: { data: SoldBackPoint[]; weeks?: number }) {
  if (data.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 130;
  const last = data[data.length - 1]?.rate ?? 0;
  const dx = data.length > 1 ? W / (data.length - 1) : W;

  const points = data.map((p, i) => [i * dx, H - p.rate * H] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${W},${H} L 0,${H} Z`;

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5">
        <Lbl>Sold-back rate · {weeks}wk</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>
          {(last * 100).toFixed(1)}%
        </Mono>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
        <defs>
          <linearGradient id="soldback-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map(y => (
          <line
            key={y}
            x1="0"
            y1={H - (y / 100) * H}
            x2={W}
            y2={H - (y / 100) * H}
            stroke="var(--line-soft)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={fillPath} fill="url(#soldback-fill)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 3 : 1.5}
            fill="var(--accent)"
          />
        ))}
      </svg>
      <div className="flex justify-between px-3 pb-2.5">
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>−{weeks}wk</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>NOW</Mono>
      </div>
    </div>
  );
}
