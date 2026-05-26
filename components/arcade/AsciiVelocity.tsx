/* ASCII bar-art velocity chart. Each tier becomes one line of block characters
 * (▁▂▃▄▅▆▇█), proportional to that tier's pull count per day. */

import { Mono } from '../primitives';
import { AsciiBox } from './primitives';

const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const EMPTY = '·';

interface VelocityPoint {
  day: string;
  starter: number;
  premium: number;
  ultra: number;
  adventure: number;
}

function lineFor(values: number[], peak: number, color: string, label: string) {
  const chars = values
    .map(v => {
      if (peak <= 0 || v <= 0) return EMPTY;
      const t = v / peak;
      const idx = Math.max(0, Math.min(BLOCKS.length - 1, Math.floor(t * BLOCKS.length)));
      return BLOCKS[idx];
    })
    .join('');
  return (
    <div
      key={label}
      className="whitespace-pre"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: 1.1,
        letterSpacing: '0.04em',
        color,
      }}
    >
      <span style={{ color: 'var(--fg-4)' }}>{label.padEnd(4)}</span> {chars}
    </div>
  );
}

export default function AsciiVelocity({ data, days = 30 }: { data: VelocityPoint[]; days?: number }) {
  if (data.length === 0) {
    return (
      <AsciiBox title={`VELOCITY.${days}D`}>
        <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO DATA</Mono>
      </AsciiBox>
    );
  }
  // Use cumulative peak so all 4 lines share a single y-scale.
  const peak = Math.max(
    1,
    ...data.map(d => Math.max(d.starter, d.premium, d.ultra, d.adventure)),
  );
  return (
    <AsciiBox title={`VELOCITY.${days}D`}>
      <div className="mb-1.5" style={{ color: 'var(--fg-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        packs/day [S | M | U | A]
      </div>
      {lineFor(data.map(d => d.starter),   peak, 'var(--tier-blue)',    'STA')}
      {lineFor(data.map(d => d.premium),   peak, 'var(--accent)',       'MON')}
      {lineFor(data.map(d => d.ultra),     peak, 'var(--tier-magenta)', 'ULT')}
      {lineFor(data.map(d => d.adventure), peak, 'var(--tier-cyan)',    'ADV')}
      <div className="mt-2 flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-4)' }}>
        <span>-{days}D</span>
        <span>NOW</span>
      </div>
    </AsciiBox>
  );
}
