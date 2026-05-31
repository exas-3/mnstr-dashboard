import type { LinePoint } from './types';
import { PULL_COLOR, SELL_COLOR, MKT_COLOR } from './constants';

/* Mark events on the line by colour: pulls (yellow), sellbacks (red),
 * marketplace buys (blue). Buys are rare so they always show; pulls and
 * sellbacks are density-gated (`showPulls`/`showSells`) so a wallet with
 * thousands of them doesn't bury the line — zoom in to reveal them. The
 * tooltip still names the card for any point. */
export function makeEventDot(showPulls: boolean, showSells: boolean) {
  return function EventDot(props: { cx?: number; cy?: number; index?: number; payload?: LinePoint }) {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null) return <g key={`d${index}`} />;
    const kind = payload?.kind;
    if (kind === 'buy') {
      return <circle key={`d${index}`} cx={cx} cy={cy} r={2.6} fill={MKT_COLOR} stroke="var(--bg)" strokeWidth={0.7} />;
    }
    if (kind === 'sellback' && showSells) {
      return <circle key={`d${index}`} cx={cx} cy={cy} r={2.6} fill={SELL_COLOR} stroke="var(--bg)" strokeWidth={0.7} />;
    }
    if (kind === 'pull' && showPulls) {
      return <circle key={`d${index}`} cx={cx} cy={cy} r={2.2} fill={PULL_COLOR} stroke="var(--bg)" strokeWidth={0.6} />;
    }
    return <g key={`d${index}`} />;
  };
}
