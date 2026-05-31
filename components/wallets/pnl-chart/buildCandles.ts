import type { WalletPnlPoint } from '@/lib/queries';
import type { Candle, CardRef, XMode } from './types';
import { CANDLE_BUCKETS } from './constants';
import { fmtAxis } from './format';

type Acc = { pulls: CardRef[]; buys: CardRef[]; sells: CardRef[] };

/* Bucket the (optionally zoomed) event window into ~CANDLE_BUCKETS OHLC candles.
 *   open  = prior bucket's close (so candles connect)
 *   high/low = net range within the bucket
 *   close = net at the bucket's end
 * `cview` is the zoom window over point indices (null = full range). PULLS&SELLS
 * mode skips empty buckets, so once the window holds fewer events than buckets
 * it's effectively one candle per event. */
export function buildCandles(points: WalletPnlPoint[], mode: XMode, cview: { s: number; e: number } | null): Candle[] {
  if (points.length === 0) return [];
  const vS = cview ? cview.s : 0;
  const vE = cview ? cview.e : points.length - 1;
  const view = points.slice(vS, vE + 1);
  if (view.length === 0) return [];

  const xOf = (p: WalletPnlPoint) => (mode === 'time' ? p.ts : p.i);
  const lo = xOf(view[0]);
  const last = view[view.length - 1];
  const hi = xOf(last);
  const enterNet = vS > 0 ? points[vS - 1].net : 0; // net entering the window

  const cardOf = (p: WalletPnlPoint, into: Acc) => {
    if (!p.card) return;
    const ref: CardRef = { title: p.card, slug: p.cardSlug ?? null };
    if (p.kind === 'sellback') into.sells.push(ref);
    else if (p.kind === 'buy') into.buys.push(ref);
    else if (p.kind === 'pull') into.pulls.push(ref);
  };
  // A card that lands in two lists of one bucket would show its picture twice.
  // Keep each slug once, preferring sells > buys > pulls.
  const dedupe = (a: Acc) => {
    const taken = new Set<string>();
    for (const c of a.sells) if (c.slug) taken.add(c.slug);
    a.buys = a.buys.filter(c => !c.slug || !taken.has(c.slug));
    for (const c of a.buys) if (c.slug) taken.add(c.slug);
    a.pulls = a.pulls.filter(c => !c.slug || !taken.has(c.slug));
  };

  // Degenerate window (all events share one X) → a single candle.
  if (hi <= lo) {
    const acc: Acc = { pulls: [], buys: [], sells: [] };
    cardOf(last, acc);
    const o = enterNet, c = last.net;
    return [{ k: 0, label: mode === 'time' ? fmtAxis(last.ts) : `#${last.i}`, ts: last.ts, i: last.i, open: o, high: Math.max(o, c), low: Math.min(o, c), close: c, range: [Math.min(o, c), Math.max(o, c)], ...acc }];
  }

  const step = (hi - lo) / CANDLE_BUCKETS;
  const out: Candle[] = [];
  let pi = 0, prevClose = enterNet, lastTs = view[0].ts, lastI = view[0].i;
  for (let b = 0; b < CANDLE_BUCKETS; b++) {
    const edge = lo + step * (b + 1);
    const open = prevClose;
    let high = open, low = open, close = open, consumed = 0;
    const acc: Acc = { pulls: [], buys: [], sells: [] };
    while (pi < view.length && xOf(view[pi]) <= edge) {
      const v = view[pi].net;
      if (v > high) high = v;
      if (v < low) low = v;
      close = v;
      cardOf(view[pi], acc);
      lastTs = view[pi].ts; lastI = view[pi].i; pi++; consumed++;
    }
    prevClose = close;
    if (mode === 'pulls' && consumed === 0) continue;
    dedupe(acc);
    const center = Math.round(lo + step * (b + 0.5));
    out.push({
      k: out.length,
      label: mode === 'time' ? fmtAxis(center) : `#${lastI}`,
      ts: mode === 'time' ? center : lastTs,
      i: lastI,
      open, high, low, close, range: [low, high], ...acc,
    });
  }
  return out;
}
