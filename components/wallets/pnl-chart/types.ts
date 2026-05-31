/* Shared types for the wallet P&L chart. */

export type XMode = 'time' | 'pulls';
export type ChartType = 'line' | 'candle';

export interface CardRef {
  title: string;
  slug: string | null;
}

/* One OHLC candle = a bucket of events. `range` = [low, high] drives the
 * Recharts bar height; `pulls`/`buys`/`sells` feed the tooltip card lists. */
export interface Candle {
  k: number;
  label: string;
  ts: number;
  i: number;
  open: number;
  high: number;
  low: number;
  close: number;
  range: [number, number];
  pulls: CardRef[];
  buys: CardRef[];
  sells: CardRef[];
}

/* One point on the line = one row of the merged P&L series. */
export interface LinePoint {
  net: number;
  ts: number;
  i: number;
  kind?: string;
  card?: string | null;
  cardSlug?: string | null;
}
