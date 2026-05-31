import type { Candle, LinePoint } from './types';
import { POS, NEG, PULL_COLOR, SELL_COLOR, MKT_COLOR, KIND_LABEL, CARD_VERB } from './constants';
import { abbrUsd, fmtAxis, fmtDateTime } from './format';
import { CardList } from './CardList';

const BOX: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
  padding: '6px 9px', fontFamily: 'var(--font-mono)',
};

/* Recharts tooltip for both chart types: a candle payload (`'open' in p`) shows
 * OHLC + the bucket's card lists; a line payload shows the running net + the
 * single card for that event. */
export function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: LinePoint | Candle }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;

  if ('open' in p) {
    const up = p.close >= p.open;
    return (
      <div style={BOX}>
        <div style={{ fontSize: 13, color: up ? POS : NEG }}>
          {p.close >= 0 ? '+' : '-'}${Math.abs(p.close).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          <span style={{ fontSize: 9, marginLeft: 5 }}>{up ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontSize: 8.5, color: 'var(--fg-3)', marginTop: 2 }}>
          O {abbrUsd(p.open)} · H {abbrUsd(p.high)} · L {abbrUsd(p.low)}
        </div>
        {(p.pulls.length > 0 || p.buys.length > 0 || p.sells.length > 0) && (
          <div style={{ maxWidth: 240 }}>
            <CardList label="PULLED" cards={p.pulls} color={PULL_COLOR} />
            <CardList label="BOUGHT · MARKET" cards={p.buys} color={MKT_COLOR} />
            <CardList label="SOLD" cards={p.sells} color={SELL_COLOR} />
          </div>
        )}
        <div style={{ fontSize: 8.5, color: 'var(--fg-4)', marginTop: 2 }}>{fmtAxis(p.ts)} · #{p.i}</div>
      </div>
    );
  }

  const pos = p.net >= 0;
  const kindLabel = p.kind && KIND_LABEL[p.kind] ? `${KIND_LABEL[p.kind]} · ` : '';
  return (
    <div style={BOX}>
      <div style={{ fontSize: 13, color: pos ? POS : NEG }}>
        {pos ? '+' : '-'}${Math.abs(p.net).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>
      {p.card && p.kind && CARD_VERB[p.kind] && (
        <CardList
          label={CARD_VERB[p.kind].toUpperCase()}
          cards={[{ title: p.card, slug: p.cardSlug ?? null }]}
          color={p.kind === 'sellback' ? SELL_COLOR : p.kind === 'buy' ? MKT_COLOR : PULL_COLOR}
        />
      )}
      <div style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2 }}>{kindLabel}{fmtDateTime(p.ts)} · #{p.i}</div>
    </div>
  );
}
