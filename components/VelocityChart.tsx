/* Hand-rolled stacked-area chart for daily pulls by tier.
 * Ported from screens.jsx::VelocityChart, but the curves are computed from
 * real data rather than hand-tuned bezier paths.
 *
 * Coordinate system: viewBox 360 × 120, preserveAspectRatio=none so it
 * fluidly fills the parent container. Internal coords are pixel-ish.
 */

import { Lbl, Mono, tierLabel, type Tier } from './primitives';

interface VelocityPoint {
  day: string;
  starter: number;
  premium: number;
  ultra: number;
}

const TIERS: Array<{ key: 'starter' | 'premium' | 'ultra'; label: Tier; color: string; gradientId: string }> = [
  { key: 'starter', label: 'Starter', color: 'var(--tier-blue)',    gradientId: 'velocity-starter' },
  { key: 'premium', label: 'Premium', color: 'var(--accent)',       gradientId: 'velocity-premium' },
  { key: 'ultra',   label: 'Ultra',   color: 'var(--tier-magenta)', gradientId: 'velocity-ultra'   },
];

export default function VelocityChart({ data, days = 30 }: { data: VelocityPoint[]; days?: number }) {
  if (data.length === 0) {
    return (
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        <div className="px-3 pt-2.5 pb-1.5">
          <Lbl>Velocity · {days}d</Lbl>
        </div>
        <div className="px-3 py-8 text-center">
          <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 120;

  // Compute cumulative stacked y per day, then peak for scale.
  const stacked = data.map(d => {
    const s = d.starter;
    const p = d.starter + d.premium;
    const u = d.starter + d.premium + d.ultra;
    return { s, p, u };
  });
  const peak = Math.max(1, ...stacked.map(s => s.u));
  const dx = data.length > 1 ? W / (data.length - 1) : W;

  function pathFor(top: (s: { s: number; p: number; u: number }) => number, bottom: (s: { s: number; p: number; u: number }) => number) {
    // Top edge L→R, bottom edge R→L
    const topPts = stacked.map((s, i) => [i * dx, H - (top(s) / peak) * H] as const);
    const botPts = stacked.map((s, i) => [i * dx, H - (bottom(s) / peak) * H] as const).reverse();
    const top0 = `M${topPts[0][0].toFixed(1)},${topPts[0][1].toFixed(1)}`;
    const topL = topPts.slice(1).map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const botL = botPts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return `${top0} ${topL} ${botL} Z`;
  }

  function lineFor(top: (s: { s: number; p: number; u: number }) => number) {
    return stacked
      .map((s, i) => {
        const x = i * dx;
        const y = H - (top(s) / peak) * H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const starterArea = pathFor(s => s.s, () => 0);
  const premiumArea = pathFor(s => s.p, s => s.s);
  const ultraArea   = pathFor(s => s.u, s => s.p);

  return (
    <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
      <div className="flex items-baseline px-3 pt-2.5 pb-1.5">
        <Lbl>Velocity · {days}d</Lbl>
        <div className="ml-auto flex gap-3">
          {TIERS.map(t => (
            <Mono key={t.key} style={{ fontSize: 8.5, color: t.color }}>
              ● {tierLabel(t.label)}
            </Mono>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
        <defs>
          <linearGradient id="velocity-starter" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.5" />
            <stop offset="1" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="velocity-premium" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="velocity-ultra" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <g stroke="var(--line-soft)" strokeDasharray="2 4">
          <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} />
          <line x1="0" y1={H * 0.5}  x2={W} y2={H * 0.5}  />
          <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} />
        </g>
        <path d={starterArea} fill="url(#velocity-starter)" />
        <path d={premiumArea} fill="url(#velocity-premium)" />
        <path d={ultraArea}   fill="url(#velocity-ultra)"   />
        <path d={lineFor(s => s.s)} fill="none" stroke="oklch(0.72 0.14 240)" strokeWidth="1" />
        <path d={lineFor(s => s.p)} fill="none" stroke="var(--accent)" strokeWidth="1.2" />
        <path d={lineFor(s => s.u)} fill="none" stroke="var(--tier-magenta)" strokeWidth="1" />
      </svg>
      <div className="flex justify-between px-3 pt-1 pb-2.5">
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>−{days}d</Mono>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>now</Mono>
      </div>
    </div>
  );
}
