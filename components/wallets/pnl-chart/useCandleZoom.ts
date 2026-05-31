import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { WalletPnlPoint } from '@/lib/queries';
import type { ChartType, XMode } from './types';
import { CANDLE_BUCKETS } from './constants';

/* Owns the candle zoom: a window `cview` over event (point) indices that
 * buildCandles re-buckets into ~CANDLE_BUCKETS, plus the wheel / drag / button
 * interactions that move it. Resets to the full range whenever the data
 * identity, chart type, or axis mode changes (indices no longer line up). */
export function useCandleZoom(points: WalletPnlPoint[], chartType: ChartType, mode: XMode) {
  // null = full range.
  const [cview, setCview] = useState<{ s: number; e: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; s: number; e: number; moved: boolean } | null>(null);

  useEffect(() => { setCview(null); }, [points, chartType, mode]);

  const candleZoomed = cview !== null;
  // Events visible now, and whether there's room to zoom in: once the view is
  // at/under CANDLE_BUCKETS events it's one candle per event, so no finer zoom.
  const eventsInView = cview ? cview.e - cview.s + 1 : points.length;
  const zoomable = points.length > CANDLE_BUCKETS;
  const canZoomIn = zoomable && eventsInView > CANDLE_BUCKETS;

  // Zoom the candle window (count-based) toward a fractional anchor (0..1).
  const zoomCandles = (factor: number, anchor = 0.5) => {
    if (factor < 1 && !canZoomIn) return;
    setCview(prev => {
      const s = prev ? prev.s : 0;
      const e = prev ? prev.e : points.length - 1;
      const count = e - s + 1;
      const nextCount = Math.max(CANDLE_BUCKETS, Math.min(points.length, Math.round(count * factor)));
      if (nextCount >= points.length) return null; // fully zoomed out
      const cursor = s + anchor * (count - 1);
      let ns = Math.round(cursor - anchor * (nextCount - 1));
      let ne = ns + nextCount - 1;
      if (ns < 0) { ns = 0; ne = nextCount - 1; }
      if (ne > points.length - 1) { ne = points.length - 1; ns = ne - (nextCount - 1); }
      return { s: Math.max(0, ns), e: ne };
    });
  };
  const plotFrac = (clientX: number) => {
    const el = boxRef.current;
    if (!el) return 0.5;
    const r = el.getBoundingClientRect();
    const left = r.left + 52, right = r.right - 16; // ~ y-axis + paddings
    return Math.max(0, Math.min(1, (clientX - left) / Math.max(1, right - left)));
  };

  // Wheel-to-zoom (non-passive so we can preventDefault page scroll).
  useEffect(() => {
    const el = boxRef.current;
    if (!el || chartType !== 'candle' || points.length <= CANDLE_BUCKETS) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      zoomCandles(ev.deltaY < 0 ? 0.82 : 1.22, plotFrac(ev.clientX));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, points.length]);

  const onPointerDown = (ev: ReactPointerEvent) => {
    if (chartType !== 'candle') return;
    dragRef.current = { x: ev.clientX, s: cview ? cview.s : 0, e: cview ? cview.e : points.length - 1, moved: false };
  };
  const onPointerMove = (ev: ReactPointerEvent) => {
    const d = dragRef.current;
    const el = boxRef.current;
    if (!d || !el) return;
    const w = el.getBoundingClientRect().width - 68;
    const size = d.e - d.s;
    const deltaEvents = Math.round(-((ev.clientX - d.x) / Math.max(1, w)) * size);
    if (Math.abs(ev.clientX - d.x) > 3) d.moved = true;
    if (deltaEvents === 0) return;
    setCview(() => {
      let ns = d.s + deltaEvents, ne = d.e + deltaEvents;
      if (ns < 0) { ns = 0; ne = size; }
      if (ne > points.length - 1) { ne = points.length - 1; ns = ne - size; }
      return (ns <= 0 && ne >= points.length - 1) ? null : { s: Math.max(0, ns), e: ne };
    });
  };
  const onPointerUp = () => { dragRef.current = null; };

  return {
    cview,
    resetView: () => setCview(null),
    boxRef,
    candleZoomed,
    eventsInView,
    zoomable,
    canZoomIn,
    zoomCandles,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
