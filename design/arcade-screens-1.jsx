// MnStr · Arcade CRT — Pulse + Tiers screens

// ════════════════════════════════════════════════════════════════
// PULSE
// ════════════════════════════════════════════════════════════════
function APulseScreen({ onOpenCard, onOpenLive }) {
  const [tf, setTf] = React.useState('24H');
  const [showBanner, setShowBanner] = React.useState(true);

  return (
    <>
      {showBanner && (
        <ABigHitBanner
          pull={{ ago: 'T-014s', title: 'SHINING_CELEBI_1ED_106.psa10', who: '@phantasmagore', tier: 'ULTRA', fmv: '8,415' }}
          onTap={onOpenCard}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* Header */}
      <div style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ flex: 1, fontFamily: A.mono }}>
          <div style={{ color: A.text, fontSize: 11, letterSpacing: '0.14em' }}>00 :: NOW</div>
          <div style={{ color: A.text, fontSize: 20, marginTop: 4, textShadow: `0 0 8px ${A.text}66` }}>
            18.MAY.2026 // 18:42 UTC
          </div>
          <div style={{ color: A.text4, fontSize: 9.5, marginTop: 3 }}>block 8,421,337 // poll T+3s // lat 42ms</div>
        </div>
        <ATimePivot value={tf} onChange={setTf}/>
      </div>

      {/* KPI grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        padding: '12px 14px 0',
      }}>
        <AKpi label={`PACKS.${tf}`}   value="412"     delta="+8.2%"/>
        <AKpi label={`USDM.${tf}`}    value="$184.5K" delta="+12.1%"/>
        <AKpi label={`PAYOUTS.${tf}`} value="$67.8K"  delta="-3.4%" dn/>
        <AKpi label={`WALLETS.${tf}`} value="189"     delta="+18"/>
        <AKpi label="PACKS.ALL"       value="40,127"  delta="cumulative"/>
        <AKpi label="USDM.ALL"        value="$4.31M"  delta="cumulative"/>
      </div>

      {/* Velocity stacked bars (ASCII) */}
      <AsciiBox title="VELOCITY.30D">
        <div style={{ color: A.text3, fontSize: 10, fontFamily: A.mono, marginBottom: 6 }}>packs/day [S | P | U]</div>
        <div style={{ fontFamily: A.mono, fontSize: 11, letterSpacing: '0.04em', lineHeight: 1.2, color: A.text, whiteSpace: 'pre' }}>
{`▁▁▂▂▃▃▄▄▅▄▄▅▅▆▆▇▇▆▆▇█▇▇█████▇█
▂▂▃▃▄▄▅▅▆▆▇▆▆▇▇▇█████████▇████
▁▁▂▂▃▃▃▄▄▄▅▅▅▆▆▆▇▇▇█████▇█████`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: A.mono, fontSize: 9, color: A.text4 }}>
          <span>-30D</span><span>-15D</span><span>NOW</span>
        </div>
      </AsciiBox>

      {/* Tier table */}
      <AsciiBox title="TIERS.EDGE">
        <table style={{ width: '100%', fontFamily: A.mono, fontSize: 10.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: A.text4 }}>
              <td style={{ paddingBottom: 6 }}>TIER</td>
              <td>PRICE</td>
              <td>EV</td>
              <td style={{ textAlign: 'right' }}>EDGE</td>
            </tr>
          </thead>
          <tbody>
            {[
              { n: 'STARTER', p: '$50',    ev: '$42.10',  e: '15.8%' },
              { n: 'PREMIUM', p: '$250',   ev: '$206.40', e: '17.4%' },
              { n: 'ULTRA',   p: '$1,250', ev: '$1,118',  e: '10.6%' },
            ].map(r => (
              <tr key={r.n}>
                <td style={{ color: A.text }}>{r.n}</td>
                <td style={{ color: A.text2 }}>{r.p}</td>
                <td style={{ color: A.text2 }}>{r.ev}</td>
                <td style={{ color: A.warn, textAlign: 'right' }}>{r.e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AsciiBox>

      {/* Live stream log */}
      <AsciiBox title="STREAM.LIVE" color={A.text} glow>
        <div style={{ fontFamily: A.mono, fontSize: 10.5, lineHeight: 1.7 }}>
          {[
            { t: '14s', tier: 'ULTRA  ', who: '@phantasmagore', act: 'SOLD', amt: '+$8,415', big: true },
            { t: '42s', tier: 'PREMIUM', who: '@kage         ', act: 'HOLD', amt: '$312   ' },
            { t: '01m', tier: 'STARTER', who: '0x7c…91a4    ', act: 'HOLD', amt: '$35    ' },
            { t: '02m', tier: 'STARTER', who: '@yumi         ', act: 'SOLD', amt: '$29.75 ' },
            { t: '03m', tier: 'PREMIUM', who: '@aether       ', act: 'SOLD', amt: '$212   ' },
          ].map((r, i) => (
            <div key={i} style={{ color: r.big ? A.warn : A.text2, textShadow: r.big ? `0 0 6px ${A.warn}88` : 'none', whiteSpace: 'pre' }}>
              <span style={{ color: A.text4 }}>[{r.t}]</span> <span style={{ color: A.text3 }}>{r.tier}</span> {r.who} <span style={{ color: r.act === 'SOLD' ? A.bad : A.text }}>{r.act}</span> <span style={{ color: r.big ? A.warn : A.text }}>{r.amt}</span>
            </div>
          ))}
          <button onClick={onOpenLive} style={{
            all: 'unset', cursor: 'pointer', marginTop: 8, display: 'block',
            color: A.text, fontFamily: A.mono, fontSize: 10, letterSpacing: '0.1em',
            padding: '4px 8px', border: `1px solid ${A.text}55`,
          }}>[ENTER] OPEN_STREAM →</button>
        </div>
      </AsciiBox>

      {/* Top hits */}
      <AsciiBox title="TOP_HITS.7D">
        <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
          {[
            { card: 'shining_celebi_1ed_106',  who: '@phantasmagore', tier: 'ULTRA',   fmv: '9,900', hot: true },
            { card: 'charizard_base_holo',     who: '0x8a…42de',      tier: 'ULTRA',   fmv: '6,150', hot: true },
            { card: 'lugia_neo_genesis_1ed',   who: '@yumi',          tier: 'PREMIUM', fmv: '3,420' },
            { card: 'mewtwo_jungle_holo',      who: '@kage',          tier: 'PREMIUM', fmv: '2,180' },
            { card: 'gengar_fossil_1ed',       who: '@aether',        tier: 'PREMIUM', fmv: '1,640' },
          ].map((h, i) => (
            <div key={i} style={{
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8,
              color: h.hot ? A.warn : A.text2,
            }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.card}</span>
              <span style={{ color: A.text4 }}>{h.tier}</span>
              <span style={{ textAlign: 'right', color: h.hot ? A.warn : A.text }}>${h.fmv}</span>
            </div>
          ))}
        </div>
      </AsciiBox>

      <ACaveat lines={[
        'MnStr FMV is the vault\'s appraisal, not market consensus.',
        'cards are physical PSA slabs. chain stores receipt only.',
      ]}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// TIERS
// ════════════════════════════════════════════════════════════════
function ATiersScreen({ onOpenCard }) {
  const [tier, setTier] = React.useState('Premium');
  const [mode, setMode] = React.useState('realised');

  const D = {
    Starter: {
      edge: { realised: '15.8%', paper: '11.2%' },
      ev:   { realised: '$42.10', paper: '$44.40' },
      pnl:  { realised: '+$211.4K', paper: '+$158.2K' },
      sold: '64.1%', hit: '18.2%',
      paid: '$1.42M', fmv: '$1.20M', expo: '-$298K',
      median: '$38', p25: '$22 — $58',
      outliers: [
        { card: 'sprigatito_mcd_017',  who: '@kage',         tier: 'STARTER', fmv: '384' },
        { card: 'pikachu_promo_058',   who: '@yumi',         tier: 'STARTER', fmv: '218' },
        { card: 'eevee_evolutions',    who: '0x7c…91a4',    tier: 'STARTER', fmv: '142' },
      ],
    },
    Premium: {
      edge: { realised: '17.4%', paper: '12.8%' },
      ev:   { realised: '$206.40', paper: '$218.10' },
      pnl:  { realised: '+$429.6K', paper: '+$316.4K' },
      sold: '61.2%', hit: '23.4%',
      paid: '$2.47M', fmv: '$2.04M', expo: '-$612.1K',
      median: '$206', p25: '$98 — $312',
      outliers: [
        { card: 'lugia_neo_genesis_1ed', who: '@yumi',   tier: 'PREMIUM', fmv: '3,420', hot: true },
        { card: 'mewtwo_jungle_holo',    who: '@kage',   tier: 'PREMIUM', fmv: '2,180' },
        { card: 'gengar_fossil_1ed',     who: '@aether', tier: 'PREMIUM', fmv: '1,640' },
      ],
    },
    Ultra: {
      edge: { realised: '10.6%', paper: '6.4%' },
      ev:   { realised: '$1,118', paper: '$1,170' },
      pnl:  { realised: '+$248.3K', paper: '+$147.2K' },
      sold: '52.8%', hit: '34.7%',
      paid: '$2.30M', fmv: '$2.05M', expo: '-$510K',
      median: '$1,080', p25: '$640 — $1,580',
      outliers: [
        { card: 'shining_celebi_1ed_106', who: '@phantasmagore', tier: 'ULTRA', fmv: '9,900', hot: true },
        { card: 'charizard_base_holo',    who: '0x8a…42de',     tier: 'ULTRA', fmv: '6,150', hot: true },
        { card: 'blastoise_base_1ed',     who: '@solo',          tier: 'ULTRA', fmv: '4,820' },
      ],
    },
  }[tier];
  const price = tier === 'Starter' ? '50' : tier === 'Premium' ? '250' : '1,250';

  return (
    <>
      {/* Tier picker */}
      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontFamily: A.mono }}>
        {['Starter', 'Premium', 'Ultra'].map((t, i) => {
          const on = t === tier;
          const ps = ['$50', '$250', '$1,250'][i];
          return (
            <button key={t} onClick={() => setTier(t)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '8px 4px',
              background: on ? A.text + '22' : 'transparent',
              border: `1px solid ${on ? A.text : A.text4}`,
              color: on ? A.text : A.text3,
              textShadow: on ? `0 0 6px ${A.text}88` : 'none',
            }}>
              <div style={{ fontSize: 9, color: A.text4, letterSpacing: '0.14em' }}>[F{i+1}] TIER</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{t.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: on ? A.warn : A.text4, marginTop: 2 }}>{ps}</div>
            </button>
          );
        })}
      </div>

      <ARpToggle value={mode} onChange={setMode}/>

      {/* Hero edge box */}
      <AsciiBox title={`HOUSE_EDGE.${mode.toUpperCase()}`} color={A.warn} glow>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontFamily: A.mono }}>
          <span style={{ color: A.warn, fontSize: 32, textShadow: `0 0 12px ${A.warn}88` }}>{D.edge[mode]}</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: A.text2, fontSize: 11 }}>EV {D.ev[mode]}</div>
            <div style={{ color: A.text4, fontSize: 10, marginTop: 2 }}>vs ${price}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontFamily: A.mono, fontSize: 11, color: A.text }}>
          <AsciiBar value={parseFloat(D.edge[mode]) * 3.33} width={22} color={A.warn}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: A.text4, fontSize: 9 }}>
            <span>0%</span><span>30%</span>
          </div>
        </div>
      </AsciiBox>

      {/* Violin / FMV dist */}
      <AsciiBox title={`FMV.DIST.${tier.toUpperCase()}`}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontFamily: A.mono }}>
          <span style={{ color: A.text3, fontSize: 9, letterSpacing: '0.12em' }}>LOG_SCALE · n=9,873</span>
          <span style={{ color: A.warn, fontSize: 10 }}>median {D.median}</span>
        </div>
        <svg viewBox="0 0 340 110" style={{ width: '100%', height: 110, marginTop: 8, display: 'block' }}>
          <line x1="140" y1="10" x2="140" y2="100" stroke={A.bad} strokeDasharray="3 3"/>
          <text x="146" y="20" fontFamily={A.mono} fontSize="9" fill={A.bad}>price ${price}</text>
          <path d="M14,60
                   C 50,58 90,55 130,52
                   C 170,49 210,46 250,44
                   C 290,43 320,43 332,44
                   L 332,68
                   C 320,69 290,69 250,68
                   C 210,66 170,63 130,60
                   C 90,58 50,57 14,56 Z"
                fill={A.text} fillOpacity="0.18" stroke={A.text} strokeWidth="0.8"/>
          {/* strip dots */}
          {[30, 50, 76, 102, 130, 160, 186, 212, 240, 268, 296, 320].map((x, i) => (
            <rect key={i} x={x - 1} y={59 + (i % 3)} width="2" height="2" fill={A.text}/>
          ))}
          <rect x="318" y="22" width="4" height="4" fill={A.warn}/>
          <text x="280" y="20" fontFamily={A.mono} fontSize="8.5" fill={A.warn}>$3,420 outlier</text>
          {/* median */}
          <line x1="118" y1="50" x2="118" y2="78" stroke={A.warn} strokeWidth="1.4"/>
        </svg>
      </AsciiBox>

      <ASoldBackChart tier={tier}/>

      {/* Econ table */}
      <AsciiBox title="BOOK.ECONOMICS">
        <table style={{ width: '100%', fontFamily: A.mono, fontSize: 10.5, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { k: 'cycled_in',         v: D.paid },
              { k: 'vault_fmv_out',     v: D.fmv },
              { k: `${mode}_pnl`,       v: D.pnl[mode],  tone: 'pos' },
              { k: 'unrealised_expo',   v: D.expo,       tone: 'neg' },
              { k: 'median_fmv',        v: D.median },
              { k: 'p25_p75',           v: D.p25 },
              { k: 'sold_back_rate',    v: D.sold },
              { k: 'hit_gt_price',      v: D.hit,        tone: 'pos' },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px dotted ${A.text4}` }}>
                <td style={{ padding: '4px 0', color: A.text4 }}>{r.k}</td>
                <td style={{ padding: '4px 0', textAlign: 'right', color: r.tone === 'pos' ? A.text : r.tone === 'neg' ? A.bad : A.text2 }}>{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AsciiBox>

      <AsciiBox title="OUTLIERS.ALL_TIME">
        <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
          {D.outliers.map((h, i) => (
            <button key={i} onClick={onOpenCard} style={{
              all: 'unset', cursor: 'pointer',
              padding: '6px 0', display: 'grid', width: '100%',
              gridTemplateColumns: '1fr 60px 70px', gap: 8,
              borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              color: h.hot ? A.warn : A.text2,
            }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.card}</span>
              <span style={{ color: A.text4 }}>{h.who}</span>
              <span style={{ textAlign: 'right', color: h.hot ? A.warn : A.text }}>${h.fmv}</span>
            </button>
          ))}
        </div>
      </AsciiBox>

      <ACaveat lines={[
        'distribution uses MnStr FMV at time of pull.',
        'realised = cycled in − payouts on sold-back.',
        'unrealised = vault FMV of holdings @ current poll.',
      ]}/>
    </>
  );
}

Object.assign(window, { APulseScreen, ATiersScreen });
