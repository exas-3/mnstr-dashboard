import type { Candle } from './types';
import { POS, NEG } from './constants';

/* Custom candlestick shape: Recharts sizes the underlying floating bar from the
 * `range` = [low, high] value, so `y`/`height` give us the pixel mapping for
 * this candle's value span. We draw the wick (low→high) and the body
 * (open↔close) from that. */
export function CandleShape(props: { x?: number; y?: number; width?: number; height?: number; payload?: Candle }) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const up = close >= open;
  const col = up ? POS : NEG;
  const cx = x + width / 2;
  if (!(high > low)) {
    return <line x1={x + width * 0.2} y1={y} x2={x + width * 0.8} y2={y} stroke={col} strokeWidth={1} />;
  }
  const scale = height / (high - low);
  const yOf = (v: number) => y + (high - v) * scale; // y == pixel of `high`
  const bodyTop = Math.min(yOf(open), yOf(close));
  const bodyH = Math.max(1, Math.abs(yOf(close) - yOf(open)));
  const w = Math.max(2, width * 0.62);
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={col} strokeWidth={1} />
      <rect x={cx - w / 2} y={bodyTop} width={w} height={bodyH} fill={col} fillOpacity={up ? 0.5 : 0.9} stroke={col} strokeWidth={1} />
    </g>
  );
}
