/* Layout + colour tokens and label maps for the wallet P&L chart. */

export const HEIGHT = 256; // chart block height (includes the brush strip)

// Target candles on screen, re-aggregated on zoom. Also the zoom-in floor:
// below this it's one candle per event, so zooming in further is disabled.
export const CANDLE_BUCKETS = 40;

// Net-sign colours (line area + candle bodies).
export const POS = 'var(--positive)';
export const NEG = 'var(--tier-magenta)';

// Event-marker colours (line dots + tooltip labels).
export const PULL_COLOR = 'var(--accent)';    // pulls (yellow)
export const SELL_COLOR = 'var(--negative)';  // sellbacks (red)
export const MKT_COLOR = 'var(--tier-blue)';  // marketplace buys (blue)

// Long-form event label (single-point line tooltip).
export const KIND_LABEL: Record<string, string> = {
  pull: 'pull',
  sellback: 'sold back',
  cash: 'cash flow',
  buy: 'bought',
};

// Verb shown above a single card in a tooltip (uppercased for the label row).
export const CARD_VERB: Record<string, string> = {
  pull: 'pulled',
  sellback: 'sold',
  buy: 'bought',
};
