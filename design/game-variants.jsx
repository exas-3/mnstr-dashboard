// MnStr — mobile game-art variants
// Five 2D-game-inspired directions. All original chrome.
//   E · Dot Matrix      (handheld 4-color)
//   F · 16-bit Menu     (fantasy console RPG)
//   G · Pastel Collector (TCG binder)
//   H · Overworld       (top-down tile map)
//   I · Spellbook       (fantasy grimoire)

// ════════════════════════════════════════════════════════════════
// SHARED MOCK DATA (keeps every variant comparable)
// ════════════════════════════════════════════════════════════════
const GD = {
  date: '18 MAY 2026',
  kpis: [
    { l: 'PACKS  24H', v: '412',    d: '+8.2%' },
    { l: 'USDM   24H', v: '$184.5K', d: '+12.1%' },
    { l: 'PAYOUT 24H', v: '$67.8K',  d: '-3.4%', dn: true },
    { l: 'WALLETS',   v: '189',     d: '+18'   },
  ],
  tiers: [
    { n: 'STARTER', p: '$50',    ev: '$42.10',  e: '15.8%', bar: 62 },
    { n: 'PREMIUM', p: '$250',   ev: '$206.40', e: '17.4%', bar: 78 },
    { n: 'ULTRA',   p: '$1,250', ev: '$1,118',  e: '10.6%', bar: 91 },
  ],
  live: [
    { t: '14s', tier: 'ULTRA',   who: '@phantasmagore', act: 'SOLD', amt: '+$8,415', big: true },
    { t: '42s', tier: 'PREMIUM', who: '@kage',          act: 'HOLD', amt: '$312'   },
    { t: '01m', tier: 'STARTER', who: '0x7c…91a4',     act: 'HOLD', amt: '$35'    },
    { t: '02m', tier: 'STARTER', who: '@yumi',          act: 'SOLD', amt: '$29.75' },
    { t: '03m', tier: 'PREMIUM', who: '@aether',        act: 'SOLD', amt: '$212'   },
  ],
  hit: {
    title: 'SHINING CELEBI',
    sub:   'NEO DESTINY · 1ED #106',
    fmv:   '$9,900',
    paid:  '$1,250',
    got:   '$8,415',
    who:   '@phantasmagore',
  },
};

// ════════════════════════════════════════════════════════════════
// E · DOT MATRIX  (handheld, 4-shade olive/amber, pixel font)
// ════════════════════════════════════════════════════════════════
const DM = {
  bg:   'oklch(0.86 0.07 110)',   // lightest screen
  bg1:  'oklch(0.74 0.10 115)',
  bg2:  'oklch(0.50 0.10 130)',
  bg3:  'oklch(0.30 0.08 140)',   // darkest pixel
  ink:  'oklch(0.18 0.06 140)',
  px:   '"Silkscreen", "VT323", ui-monospace, monospace',
};

function DMTitle({ children }) {
  return (
    <div style={{
      background: DM.bg3, color: DM.bg,
      padding: '3px 8px',
      fontFamily: DM.px, fontSize: 10, letterSpacing: '0.06em',
      textTransform: 'uppercase',
      display: 'inline-block',
    }}>{children}</div>
  );
}

function DMTile({ children, style = {} }) {
  return (
    <div style={{
      background: DM.bg, color: DM.ink,
      border: `2px solid ${DM.ink}`,
      boxShadow: `4px 4px 0 0 ${DM.bg3}`,
      padding: 10,
      fontFamily: DM.px,
      ...style,
    }}>{children}</div>
  );
}

function DMDither({ height = 12 }) {
  return (
    <div style={{
      height,
      backgroundImage: `
        repeating-linear-gradient(0deg,   ${DM.bg2} 0 2px, transparent 2px 4px),
        repeating-linear-gradient(90deg,  ${DM.bg2} 0 2px, transparent 2px 4px)
      `,
      backgroundSize: '4px 4px',
    }}/>
  );
}

function DMBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'NOW',  i: '◆' },
    { id: 'tiers',   t: 'PACK', i: '▦' },
    { id: 'wallets', t: 'PLYR', i: '☻' },
    { id: 'cards',   t: 'DEX',  i: '▢' },
    { id: 'live',    t: 'LIVE', i: '◉' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: DM.bg3,
      borderTop: `4px solid ${DM.ink}`,
      fontFamily: DM.px,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, padding: '6px 4px 4px' }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              background: on ? DM.bg : DM.bg2,
              border: `2px solid ${DM.ink}`,
              color: on ? DM.ink : DM.bg3,
              padding: '6px 0',
              boxShadow: on ? `0 0 0 2px ${DM.bg1}` : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{t.i}</span>
              <span style={{ fontSize: 8, letterSpacing: '0.06em' }}>{t.t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DMPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0, background: DM.bg1, color: DM.ink,
      fontFamily: DM.px, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Title strip */}
        <div style={{
          paddingTop: 56, padding: '56px 12px 0',
        }}>
          <div style={{
            background: DM.bg3, border: `3px solid ${DM.ink}`, padding: 10,
            color: DM.bg,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, letterSpacing: '0.08em' }}>MnSTR</div>
              <div style={{ fontSize: 8, marginTop: 4, color: DM.bg1 }}>POCKET LEDGER · v0.4</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: DM.bg1 }}>{GD.date}</div>
              <div style={{ fontSize: 10, marginTop: 3 }}>▶ NOW</div>
            </div>
          </div>
        </div>

        {/* KPI 2x2 */}
        <div style={{ padding: '12px 12px 0' }}>
          <DMTitle>STATUS</DMTitle>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GD.kpis.map((k, i) => (
              <DMTile key={i}>
                <div style={{ fontSize: 8, color: DM.bg3 }}>{k.l}</div>
                <div style={{ fontSize: 16, marginTop: 4 }}>{k.v}</div>
                <div style={{ fontSize: 8, marginTop: 2, color: DM.bg2 }}>{k.d}</div>
              </DMTile>
            ))}
          </div>
        </div>

        {/* Tier table */}
        <div style={{ padding: '14px 12px 0' }}>
          <DMTitle>PACK RATES</DMTitle>
          <DMTile style={{ marginTop: 8, padding: 0 }}>
            {GD.tiers.map((t, i) => (
              <div key={t.n} style={{
                padding: '10px 12px',
                borderTop: i === 0 ? 'none' : `2px solid ${DM.ink}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11 }}>{t.n}</span>
                  <span style={{ fontSize: 11 }}>{t.p}</span>
                </div>
                <div style={{ marginTop: 6, height: 8, background: DM.bg1, position: 'relative', border: `1px solid ${DM.ink}` }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${t.bar}%`, background: DM.bg3 }}/>
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
                  <span>EV {t.ev}</span>
                  <span>EDGE {t.e}</span>
                </div>
              </div>
            ))}
          </DMTile>
        </div>

        {/* Big hit dialog */}
        <div style={{ padding: '14px 12px 0' }}>
          <DMTitle>★ RARE PULL</DMTitle>
          <DMTile style={{ marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
              <div style={{
                aspectRatio: '5/7',
                background: `repeating-linear-gradient(45deg, ${DM.bg2} 0 3px, ${DM.bg1} 3px 6px)`,
                border: `2px solid ${DM.ink}`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, textAlign: 'center', background: DM.bg3, color: DM.bg, fontSize: 8 }}>PSA 10</div>
              </div>
              <div>
                <div style={{ fontSize: 11, lineHeight: 1.3 }}>{GD.hit.title}</div>
                <div style={{ fontSize: 8, marginTop: 4, color: DM.bg3 }}>{GD.hit.sub}</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9 }}>FMV {GD.hit.fmv}</div>
                  <div style={{ fontSize: 9, marginTop: 2 }}>BY {GD.hit.who}</div>
                </div>
              </div>
            </div>
            <DMDither height={6}/>
            <div style={{ fontSize: 9, marginTop: 6, color: DM.bg3 }}>{'▸'} SOLD BACK FOR {GD.hit.got}</div>
          </DMTile>
        </div>

        {/* Live log */}
        <div style={{ padding: '14px 12px 0' }}>
          <DMTitle>LIVE LOG</DMTitle>
          <DMTile style={{ marginTop: 8, padding: 0 }}>
            {GD.live.map((l, i) => (
              <div key={i} style={{
                padding: '6px 10px',
                borderTop: i === 0 ? 'none' : `2px dashed ${DM.bg2}`,
                fontSize: 9.5,
                display: 'grid', gridTemplateColumns: '24px 50px 1fr auto', gap: 6,
                background: l.big ? DM.bg : 'transparent',
              }}>
                <span style={{ color: DM.bg3 }}>{l.t}</span>
                <span>{l.tier}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.who}</span>
                <span>{l.amt}</span>
              </div>
            ))}
          </DMTile>
        </div>

        <div style={{ padding: '16px 12px 4px', fontSize: 8.5, color: DM.bg3, lineHeight: 1.7 }}>
          {'† MnSTR FMV. NOT MARKET CONSENSUS.'}<br/>
          {'† CARDS ARE PHYSICAL SLABS. NOT NFTs.'}
        </div>
      </div>

      <DMBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// F · 16-BIT MENU  (fantasy console RPG — stone + gold)
// ════════════════════════════════════════════════════════════════
const RG = {
  bg:    'oklch(0.16 0.05 285)',
  panel: 'oklch(0.22 0.06 285)',
  panel2:'oklch(0.28 0.07 285)',
  gold:  'oklch(0.80 0.13 80)',
  goldD: 'oklch(0.62 0.10 80)',
  goldL: 'oklch(0.92 0.10 85)',
  ivory: 'oklch(0.96 0.02 90)',
  ivory2:'oklch(0.78 0.04 90)',
  ivory3:'oklch(0.58 0.04 90)',
  red:   'oklch(0.72 0.22 25)',
  green: 'oklch(0.78 0.16 145)',
  blue:  'oklch(0.72 0.15 230)',
  px:    '"Pixelify Sans", "VT323", ui-monospace, monospace',
  sans:  '"Pixelify Sans", ui-sans-serif, system-ui, sans-serif',
};

// Pixel chrome — chunky border via box-shadow steps
function RGFrame({ children, style = {} }) {
  return (
    <div style={{
      background: RG.panel,
      border: `2px solid ${RG.gold}`,
      boxShadow: `
        0 0 0 2px ${RG.bg},
        0 0 0 3px ${RG.goldD},
        inset 0 0 0 2px ${RG.panel2}
      `,
      padding: 12,
      ...style,
    }}>{children}</div>
  );
}

function RGBar({ label, value, max = 100, color = RG.gold, sub }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RG.px, fontSize: 11, color: RG.goldL, letterSpacing: '0.04em' }}>
        <span>{label}</span>
        <span style={{ color: RG.ivory }}>{sub}</span>
      </div>
      <div style={{
        marginTop: 4,
        height: 10,
        background: RG.bg,
        border: `2px solid ${RG.goldD}`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: `${w}%`,
          background: `linear-gradient(180deg, ${color}, ${RG.goldD})`,
          borderRight: `2px solid ${RG.bg}`,
        }}/>
      </div>
    </div>
  );
}

function RGBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'PULSE',  i: '✦' },
    { id: 'tiers',   t: 'PACK',   i: '✚' },
    { id: 'wallets', t: 'HEROES', i: '♛' },
    { id: 'cards',   t: 'TOMES',  i: '◈' },
    { id: 'live',    t: 'LIVE',   i: '⚡' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: RG.bg,
      borderTop: `2px solid ${RG.gold}`,
      boxShadow: `inset 0 2px 0 ${RG.goldD}`,
      fontFamily: RG.px,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, padding: '8px 8px 4px' }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '6px 0',
              border: `2px solid ${on ? RG.gold : RG.goldD}66`,
              background: on ? `linear-gradient(180deg, ${RG.panel2}, ${RG.panel})` : 'transparent',
              color: on ? RG.goldL : RG.ivory3,
              position: 'relative',
            }}>
              {on && (
                <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: RG.gold }}>▶</span>
              )}
              <div style={{ fontSize: 14, color: on ? RG.gold : RG.ivory3, lineHeight: 1 }}>{t.i}</div>
              <div style={{ fontSize: 9, marginTop: 2, letterSpacing: '0.04em' }}>{t.t}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RGPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0, background: RG.bg, color: RG.ivory,
      fontFamily: RG.sans, overflow: 'hidden',
      backgroundImage: `
        radial-gradient(600px 300px at 50% -10%, oklch(0.30 0.10 285), transparent 70%),
        repeating-linear-gradient(45deg, oklch(0.18 0.05 285) 0 8px, transparent 8px 16px)
      `,
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Title plaque */}
        <div style={{ paddingTop: 56, padding: '56px 14px 0', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: `linear-gradient(180deg, ${RG.goldL}, ${RG.gold} 50%, ${RG.goldD})`,
            color: RG.bg,
            padding: '8px 22px',
            border: `2px solid ${RG.bg}`,
            boxShadow: `0 0 0 2px ${RG.goldD}, 4px 4px 0 0 ${RG.bg}`,
            fontFamily: RG.px, fontSize: 16, letterSpacing: '0.16em',
          }}>
            ✦ MnSTR ✦
          </div>
          <div style={{ marginTop: 8, fontFamily: RG.px, fontSize: 11, color: RG.ivory2, letterSpacing: '0.16em' }}>
            ─ ⟢ {GD.date} ⟣ ─
          </div>
        </div>

        {/* Status window — HP/MP style bars */}
        <div style={{ padding: '16px 14px 0' }}>
          <RGFrame>
            <div style={{ fontFamily: RG.px, fontSize: 11, color: RG.goldL, letterSpacing: '0.12em' }}>◆ THE VAULT</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RGBar label="PACKS"  value={62}  sub="412 / 700" color={RG.green}/>
              <RGBar label="VOLUME" value={78}  sub="$184.5K"    color={RG.gold}/>
              <RGBar label="HOUSE"  value={42}  sub="+$116.7K"   color={RG.blue}/>
            </div>
          </RGFrame>
        </div>

        {/* Pack grid — item-slot style */}
        <div style={{ padding: '14px 14px 0' }}>
          <RGFrame>
            <div style={{ fontFamily: RG.px, fontSize: 11, color: RG.goldL, letterSpacing: '0.12em' }}>◆ PACKS</div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {GD.tiers.map((t, i) => {
                const colors = [RG.blue, RG.gold, RG.red];
                return (
                  <div key={t.n} style={{
                    background: RG.bg, padding: 8,
                    border: `2px solid ${RG.goldD}`,
                    boxShadow: `inset 0 0 0 1px ${RG.bg}`,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      aspectRatio: '1/1', width: '70%', margin: '4px auto 8px',
                      background: `linear-gradient(135deg, ${colors[i]}, ${RG.bg})`,
                      border: `2px solid ${colors[i]}`,
                      boxShadow: `0 0 12px ${colors[i]}66, inset 0 0 0 1px ${RG.bg}`,
                    }}/>
                    <div style={{ fontFamily: RG.px, fontSize: 9, color: RG.ivory2, letterSpacing: '0.08em' }}>{t.n}</div>
                    <div style={{ fontFamily: RG.px, fontSize: 11, color: RG.goldL, marginTop: 2 }}>{t.p}</div>
                    <div style={{ fontFamily: RG.px, fontSize: 8.5, color: RG.green, marginTop: 4 }}>{t.e} EDGE</div>
                  </div>
                );
              })}
            </div>
          </RGFrame>
        </div>

        {/* Boss-drop banner */}
        <div style={{ padding: '14px 14px 0' }}>
          <RGFrame style={{
            background: `linear-gradient(180deg, ${RG.panel2}, ${RG.panel})`,
            border: `2px solid ${RG.gold}`,
            boxShadow: `0 0 0 2px ${RG.bg}, 0 0 0 3px ${RG.gold}, 0 0 24px ${RG.gold}66`,
          }}>
            <div style={{ fontFamily: RG.px, fontSize: 11, color: RG.gold, letterSpacing: '0.18em', textAlign: 'center' }}>
              ⚡ RARE DROP ⚡
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
              <div style={{
                aspectRatio: '5/7',
                background: `
                  radial-gradient(circle at 30% 25%, ${RG.gold}66, transparent 60%),
                  repeating-linear-gradient(135deg, oklch(0.25 0.06 285), oklch(0.25 0.06 285) 4px, oklch(0.20 0.05 285) 4px, oklch(0.20 0.05 285) 8px)
                `,
                border: `2px solid ${RG.gold}`,
                position: 'relative',
                boxShadow: `inset 0 0 0 1px ${RG.bg}, 0 0 12px ${RG.gold}88`,
              }}>
                <div style={{ position: 'absolute', top: 4, right: 4, fontFamily: RG.px, fontSize: 8, color: RG.gold }}>PSA 10</div>
              </div>
              <div>
                <div style={{ fontFamily: RG.px, fontSize: 13, color: RG.ivory, letterSpacing: '0.04em' }}>{GD.hit.title}</div>
                <div style={{ fontFamily: RG.px, fontSize: 9, color: RG.ivory3, marginTop: 4 }}>{GD.hit.sub}</div>
                <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                  <div style={{ fontFamily: RG.px, fontSize: 10, color: RG.ivory2 }}>{'► HERO  '}{GD.hit.who}</div>
                  <div style={{ fontFamily: RG.px, fontSize: 10, color: RG.ivory2 }}>{'► FMV   '}<span style={{ color: RG.gold }}>{GD.hit.fmv}</span></div>
                  <div style={{ fontFamily: RG.px, fontSize: 10, color: RG.ivory2 }}>{'► CASH  '}<span style={{ color: RG.green }}>{GD.hit.got}</span></div>
                </div>
              </div>
            </div>
          </RGFrame>
        </div>

        {/* Log */}
        <div style={{ padding: '14px 14px 0' }}>
          <RGFrame style={{ padding: 0 }}>
            <div style={{ padding: '10px 12px 6px', fontFamily: RG.px, fontSize: 11, color: RG.goldL, letterSpacing: '0.12em' }}>◆ BATTLE LOG</div>
            {GD.live.map((l, i) => (
              <div key={i} style={{
                padding: '6px 12px',
                borderTop: `2px solid ${RG.panel2}`,
                display: 'grid', gridTemplateColumns: '32px 60px 1fr auto', gap: 8,
                fontFamily: RG.px, fontSize: 10,
                color: l.big ? RG.gold : RG.ivory2,
              }}>
                <span style={{ color: RG.ivory3 }}>{l.t}</span>
                <span style={{ color: l.big ? RG.gold : RG.ivory3 }}>{l.tier}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.who}</span>
                <span>{l.amt}</span>
              </div>
            ))}
          </RGFrame>
        </div>

        <div style={{ padding: '16px 14px 4px', fontFamily: RG.px, fontSize: 9, color: RG.ivory3, lineHeight: 1.7, letterSpacing: '0.02em' }}>
          † MnSTR FMV is the realm's appraisal.<br/>
          † Slabs are physical relics, not NFTs.
        </div>
      </div>

      <RGBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// G · PASTEL COLLECTOR  (binder, soft pastel, friendly)
// ════════════════════════════════════════════════════════════════
const PC = {
  bg:    'oklch(0.95 0.025 80)',
  page:  'oklch(0.98 0.012 80)',
  pink:  'oklch(0.86 0.10 20)',
  pinkD: 'oklch(0.66 0.16 20)',
  mint:  'oklch(0.88 0.10 165)',
  mintD: 'oklch(0.58 0.12 165)',
  sky:   'oklch(0.88 0.10 230)',
  skyD:  'oklch(0.58 0.13 230)',
  sun:   'oklch(0.92 0.13 95)',
  sunD:  'oklch(0.66 0.16 80)',
  ink:   'oklch(0.30 0.05 285)',
  ink2:  'oklch(0.46 0.04 285)',
  ink3:  'oklch(0.65 0.03 285)',
  px:    '"Pixelify Sans", ui-sans-serif, system-ui, sans-serif',
  sans:  '"Pixelify Sans", ui-sans-serif, system-ui, sans-serif',
};

function PCTag({ children, color = PC.pink }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      background: color,
      color: PC.ink,
      fontFamily: PC.px, fontSize: 11, letterSpacing: '0.06em',
      border: `2px solid ${PC.ink}`,
      boxShadow: `3px 3px 0 0 ${PC.ink}`,
    }}>{children}</span>
  );
}

function PCCard({ color = PC.sky, children, style = {} }) {
  return (
    <div style={{
      background: PC.page,
      border: `2px solid ${PC.ink}`,
      boxShadow: `4px 4px 0 0 ${color}, 4px 4px 0 2px ${PC.ink}`,
      padding: 12,
      ...style,
    }}>{children}</div>
  );
}

function PCBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'Now',     i: '★', c: PC.pink },
    { id: 'tiers',   t: 'Packs',   i: '✦', c: PC.sun },
    { id: 'wallets', t: 'Friends', i: '♥', c: PC.mint },
    { id: 'cards',   t: 'Dex',     i: '◇', c: PC.sky },
    { id: 'live',    t: 'Live',    i: '⚡', c: PC.pinkD },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: PC.bg,
      borderTop: `2px solid ${PC.ink}`,
      fontFamily: PC.px,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, padding: '8px 8px 4px' }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '6px 0',
              background: on ? t.c : PC.page,
              border: `2px solid ${PC.ink}`,
              boxShadow: on ? `0 0 0 1px ${PC.bg}, 3px 3px 0 0 ${PC.ink}` : `2px 2px 0 0 ${PC.ink}`,
              color: PC.ink,
              transform: on ? 'translate(-1px, -1px)' : 'none',
            }}>
              <div style={{ fontSize: 16, lineHeight: 1 }}>{t.i}</div>
              <div style={{ fontSize: 10, marginTop: 3, letterSpacing: '0.04em' }}>{t.t}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PCSparkle({ x, y, s = 8, color = PC.sun }) {
  return (
    <svg style={{ position: 'absolute', left: x, top: y, width: s * 2, height: s * 2, pointerEvents: 'none' }} viewBox="-10 -10 20 20">
      <path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z" fill={color} stroke={PC.ink} strokeWidth="1"/>
    </svg>
  );
}

function PCPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0, background: PC.bg, color: PC.ink,
      fontFamily: PC.sans, overflow: 'hidden',
      backgroundImage: `radial-gradient(circle at 20% 30%, ${PC.pink}33, transparent 50%), radial-gradient(circle at 80% 60%, ${PC.sky}33, transparent 50%)`,
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Cute header */}
        <div style={{ paddingTop: 60, padding: '60px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44,
            background: `linear-gradient(135deg, ${PC.pink}, ${PC.sun})`,
            border: `2px solid ${PC.ink}`, boxShadow: `3px 3px 0 0 ${PC.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: PC.px, fontSize: 20 }}>★</span>
          </div>
          <div>
            <div style={{ fontFamily: PC.px, fontSize: 18, letterSpacing: '0.02em' }}>Mn☆Str Binder</div>
            <div style={{ fontFamily: PC.px, fontSize: 10, color: PC.ink2 }}>{GD.date} · Hi, Trainer!</div>
          </div>
        </div>

        {/* KPI sticker grid */}
        <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {GD.kpis.map((k, i) => {
            const colors = [PC.pink, PC.mint, PC.sky, PC.sun];
            return (
              <PCCard key={i} color={colors[i]}>
                <div style={{ fontFamily: PC.px, fontSize: 10, color: PC.ink2, letterSpacing: '0.04em' }}>{k.l}</div>
                <div style={{ fontFamily: PC.px, fontSize: 22, marginTop: 4, color: PC.ink }}>{k.v}</div>
                <div style={{ fontFamily: PC.px, fontSize: 10, marginTop: 2, color: k.dn ? PC.pinkD : PC.mintD }}>{k.d}</div>
              </PCCard>
            );
          })}
        </div>

        {/* Featured holo */}
        <div style={{ padding: '18px 16px 0', position: 'relative' }}>
          <PCTag color={PC.pink}>★ HOLO PULL</PCTag>
          <div style={{ marginTop: 10, position: 'relative' }}>
            <PCCard color={PC.sun}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, position: 'relative' }}>
                <div style={{
                  aspectRatio: '5/7',
                  background: `
                    linear-gradient(135deg, ${PC.pink}, ${PC.sky}, ${PC.mint}, ${PC.sun}),
                    ${PC.page}
                  `,
                  border: `2px solid ${PC.ink}`,
                  boxShadow: `3px 3px 0 0 ${PC.ink}`,
                  position: 'relative',
                }}>
                  <div style={{ position: 'absolute', inset: 4, border: `1px dashed ${PC.ink}`, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: PC.px, fontSize: 8, color: PC.ink, background: PC.page, padding: '1px 4px', alignSelf: 'flex-start' }}>PSA 10</div>
                    <div style={{ fontFamily: PC.px, fontSize: 10, color: PC.ink, background: PC.page, padding: '1px 4px', alignSelf: 'flex-end' }}>{GD.hit.fmv}</div>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: PC.px, fontSize: 15, color: PC.ink, lineHeight: 1.2 }}>{GD.hit.title}</div>
                  <div style={{ fontFamily: PC.px, fontSize: 10, color: PC.ink2, marginTop: 3 }}>{GD.hit.sub}</div>
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <PCTag color={PC.mint}>HP {GD.hit.fmv}</PCTag>
                    <PCTag color={PC.sky}>1ed</PCTag>
                    <PCTag color={PC.pink}>SOLD</PCTag>
                  </div>
                  <div style={{ marginTop: 12, fontFamily: PC.px, fontSize: 10, color: PC.ink2 }}>
                    pulled by <span style={{ color: PC.pinkD }}>{GD.hit.who}</span>
                  </div>
                </div>
              </div>
            </PCCard>
            <PCSparkle x={20} y={-6} s={9}/>
            <PCSparkle x={140} y={140} s={6} color={PC.pink}/>
            <PCSparkle x={'85%'} y={'18%'} s={7} color={PC.mint}/>
          </div>
        </div>

        {/* Packs */}
        <div style={{ padding: '18px 16px 0' }}>
          <PCTag color={PC.mint}>✦ PACKS</PCTag>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {GD.tiers.map((t, i) => {
              const colors = [PC.sky, PC.sun, PC.pink];
              return (
                <PCCard key={t.n} color={colors[i]} style={{ padding: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: PC.px, fontSize: 10, color: PC.ink2 }}>{t.n}</div>
                  <div style={{ fontFamily: PC.px, fontSize: 18, marginTop: 4 }}>{t.p}</div>
                  <div style={{ marginTop: 6, height: 6, background: PC.bg, border: `1px solid ${PC.ink}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${t.bar}%`, background: colors[i] }}/>
                  </div>
                  <div style={{ fontFamily: PC.px, fontSize: 9, marginTop: 4, color: PC.ink2 }}>edge {t.e}</div>
                </PCCard>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        <div style={{ padding: '18px 16px 0' }}>
          <PCTag color={PC.sky}>⚡ Live</PCTag>
          <div style={{ marginTop: 10 }}>
            <PCCard color={PC.mint} style={{ padding: 0 }}>
              {GD.live.map((l, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  borderTop: i === 0 ? 'none' : `2px dashed ${PC.ink3}`,
                  display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10,
                  fontFamily: PC.px, fontSize: 11,
                  background: l.big ? PC.sun + '55' : 'transparent',
                }}>
                  <span style={{ color: PC.ink3 }}>{l.t}</span>
                  <span style={{ color: PC.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.who}</span>
                  <span style={{ color: l.big ? PC.pinkD : PC.ink2 }}>{l.amt}</span>
                </div>
              ))}
            </PCCard>
          </div>
        </div>

        <div style={{ padding: '18px 16px 4px', fontFamily: PC.px, fontSize: 10, color: PC.ink3, lineHeight: 1.6 }}>
          ☆ MnStr FMV — what the binder says it's worth, not the world.<br/>
          ☆ Cards live in real life. Not NFTs!
        </div>
      </div>

      <PCBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// H · OVERWORLD  (top-down tile map, dashboard as zones)
// ════════════════════════════════════════════════════════════════
const OW = {
  grass:  'oklch(0.55 0.11 145)',
  grass2: 'oklch(0.48 0.10 145)',
  path:   'oklch(0.74 0.07 75)',
  pathD:  'oklch(0.58 0.07 75)',
  water:  'oklch(0.52 0.13 220)',
  waterL: 'oklch(0.70 0.13 220)',
  stone:  'oklch(0.62 0.02 80)',
  stoneD: 'oklch(0.40 0.02 80)',
  wood:   'oklch(0.40 0.10 50)',
  woodL:  'oklch(0.62 0.10 55)',
  roof:   'oklch(0.45 0.16 25)',
  roofD:  'oklch(0.32 0.14 25)',
  sky:    'oklch(0.85 0.05 230)',
  ink:    'oklch(0.18 0.02 80)',
  ivory:  'oklch(0.95 0.02 80)',
  ivoryD: 'oklch(0.80 0.02 80)',
  px:     '"Silkscreen", "VT323", ui-monospace, monospace',
};

function OWTile({ children, style = {} }) {
  return (
    <div style={{
      background: OW.ivory,
      border: `3px solid ${OW.ink}`,
      boxShadow: `inset 0 0 0 2px ${OW.ivoryD}`,
      padding: 10,
      fontFamily: OW.px,
      ...style,
    }}>{children}</div>
  );
}

function OWBuilding({ roof = OW.roof, w = 60, h = 70, label, icon }) {
  return (
    <div style={{ width: w, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* roof triangle */}
      <div style={{
        width: 0, height: 0,
        borderLeft: `${w/2}px solid transparent`,
        borderRight: `${w/2}px solid transparent`,
        borderBottom: `${h * 0.4}px solid ${roof}`,
        filter: 'drop-shadow(2px 2px 0 ' + OW.ink + ')',
      }}/>
      {/* body */}
      <div style={{
        width: w - 6, height: h * 0.55,
        background: OW.ivory,
        border: `3px solid ${OW.ink}`,
        boxShadow: `inset 0 0 0 2px ${OW.ivoryD}, 2px 2px 0 0 ${OW.ink}`,
        marginTop: -2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* door */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 12, height: 16, background: OW.wood, border: `2px solid ${OW.ink}`,
        }}/>
        <span style={{ fontFamily: OW.px, fontSize: 14, color: OW.ink, marginTop: -10 }}>{icon}</span>
      </div>
      <div style={{
        marginTop: 6,
        background: OW.ink, color: OW.ivory,
        padding: '2px 6px',
        fontFamily: OW.px, fontSize: 8, letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

function OWBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'TOWN',  i: '⌂' },
    { id: 'tiers',   t: 'SHOP',  i: '$' },
    { id: 'wallets', t: 'GUILD', i: '♛' },
    { id: 'cards',   t: 'DEX',   i: '✦' },
    { id: 'live',    t: 'NOW',   i: '◉' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: OW.ink,
      borderTop: `3px solid ${OW.ivory}`,
      fontFamily: OW.px,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', padding: '6px 4px 4px', gap: 3 }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '6px 0',
              background: on ? OW.ivory : 'transparent',
              border: `2px solid ${on ? OW.ivory : OW.ivoryD + '55'}`,
              color: on ? OW.ink : OW.ivoryD,
              boxShadow: on ? `2px 2px 0 0 ${OW.path}` : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{t.i}</span>
              <span style={{ fontSize: 8, letterSpacing: '0.05em' }}>{t.t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OWPulse() {
  const [tab, setTab] = React.useState('pulse');

  return (
    <div style={{
      position: 'absolute', inset: 0, background: OW.grass, color: OW.ink,
      fontFamily: OW.px, overflow: 'hidden',
      backgroundImage: `
        repeating-linear-gradient(0deg,   ${OW.grass2} 0 8px, transparent 8px 16px),
        repeating-linear-gradient(90deg,  ${OW.grass2} 0 8px, transparent 8px 16px)
      `,
      backgroundSize: '16px 16px',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* HUD bar */}
        <div style={{ paddingTop: 56, padding: '56px 12px 0' }}>
          <div style={{
            background: OW.ivory, border: `3px solid ${OW.ink}`,
            boxShadow: `inset 0 0 0 2px ${OW.ivoryD}, 3px 3px 0 0 ${OW.ink}`,
            padding: '8px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: OW.px, fontSize: 12, letterSpacing: '0.08em' }}>MnSTR · TOWN</div>
              <div style={{ fontFamily: OW.px, fontSize: 9, color: OW.stoneD, marginTop: 3 }}>{GD.date} · CLEAR ☀</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: OW.px, fontSize: 8, color: OW.stoneD }}>WALLET</div>
              <div style={{ fontFamily: OW.px, fontSize: 11 }}>$184.5K</div>
            </div>
          </div>
        </div>

        {/* Map area — buildings on path */}
        <div style={{ padding: '14px 12px 0' }}>
          <div style={{
            position: 'relative',
            background: OW.grass,
            border: `3px solid ${OW.ink}`,
            boxShadow: `2px 2px 0 0 ${OW.ink}`,
            height: 290,
            overflow: 'hidden',
          }}>
            {/* path */}
            <div style={{
              position: 'absolute', top: 130, left: -10, right: -10, height: 28,
              background: OW.path,
              borderTop: `3px solid ${OW.pathD}`, borderBottom: `3px solid ${OW.pathD}`,
              backgroundImage: `repeating-linear-gradient(90deg, ${OW.pathD} 0 6px, transparent 6px 18px)`,
              backgroundSize: '24px 4px', backgroundPosition: 'center',
              backgroundRepeat: 'repeat-x',
            }}/>
            {/* water bottom-right */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 100, height: 60,
              background: OW.water,
              borderTop: `3px solid ${OW.waterL}`,
              borderLeft: `3px solid ${OW.ink}`,
              backgroundImage: `repeating-linear-gradient(0deg, ${OW.waterL} 0 2px, transparent 2px 8px)`,
            }}/>
            {/* trees - top corners */}
            {[ [12, 16], [50, 8], [330, 12], [340, 60] ].map(([x, y], i) => (
              <div key={'t'+i} style={{
                position: 'absolute', left: x, top: y,
                width: 18, height: 22,
                background: 'oklch(0.32 0.10 145)',
                borderRadius: '50% 50% 30% 30%',
                border: `2px solid ${OW.ink}`,
                boxShadow: `1px 1px 0 0 ${OW.ink}`,
              }}/>
            ))}
            {/* buildings */}
            <div style={{ position: 'absolute', top: 30, left: 20 }}>
              <OWBuilding roof={OW.roof}   w={66} h={70} label="PACK SHOP" icon="$"/>
            </div>
            <div style={{ position: 'absolute', top: 18, left: 130 }}>
              <OWBuilding roof={OW.water}  w={66} h={70} label="GUILD HALL" icon="♛"/>
            </div>
            <div style={{ position: 'absolute', top: 30, right: 30 }}>
              <OWBuilding roof={OW.woodL}  w={66} h={70} label="POKé-DEX" icon="✦"/>
            </div>
            <div style={{ position: 'absolute', bottom: 80, left: 90 }}>
              <OWBuilding roof={OW.roofD}  w={66} h={70} label="VAULT" icon="◆"/>
            </div>
            {/* player sprite */}
            <div style={{
              position: 'absolute', top: 130, left: 60,
              width: 16, height: 16, background: OW.ivory,
              border: `2px solid ${OW.ink}`,
              boxShadow: `2px 2px 0 0 ${OW.ink}`,
            }}/>
            <div style={{
              position: 'absolute', top: 158, left: 56,
              fontFamily: OW.px, fontSize: 7, color: OW.ivory,
              background: OW.ink, padding: '1px 3px',
            }}>YOU</div>
          </div>
        </div>

        {/* Quest log */}
        <div style={{ padding: '14px 12px 0' }}>
          <div style={{
            background: OW.ivory,
            border: `3px solid ${OW.ink}`,
            boxShadow: `inset 0 0 0 2px ${OW.ivoryD}, 3px 3px 0 0 ${OW.ink}`,
            padding: 0,
          }}>
            <div style={{
              background: OW.ink, color: OW.ivory,
              padding: '4px 10px',
              fontFamily: OW.px, fontSize: 10, letterSpacing: '0.1em',
            }}>★ TOWN BULLETIN — {GD.date}</div>
            <div style={{ padding: '10px 12px' }}>
              {GD.kpis.map((k, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10,
                  padding: '4px 0',
                  fontFamily: OW.px, fontSize: 10,
                  borderTop: i === 0 ? 'none' : `1px dotted ${OW.stoneD}`,
                }}>
                  <span style={{ color: OW.stoneD }}>{k.l}</span>
                  <span>{k.v}</span>
                  <span style={{ color: k.dn ? OW.roof : 'oklch(0.40 0.14 145)' }}>{k.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Encounter dialog */}
        <div style={{ padding: '14px 12px 0' }}>
          <OWTile style={{ padding: 0 }}>
            <div style={{
              background: OW.roof, color: OW.ivory,
              padding: '4px 10px',
              fontFamily: OW.px, fontSize: 10, letterSpacing: '0.1em',
            }}>! ENCOUNTER</div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '70px 1fr', gap: 12 }}>
              <div style={{
                aspectRatio: '5/7',
                background: `repeating-linear-gradient(45deg, ${OW.grass2} 0 4px, ${OW.grass} 4px 8px)`,
                border: `3px solid ${OW.ink}`,
              }}/>
              <div>
                <div style={{ fontFamily: OW.px, fontSize: 11, color: OW.ink }}>"A wild {GD.hit.title.toLowerCase()} appeared!"</div>
                <div style={{ marginTop: 6, fontFamily: OW.px, fontSize: 9, color: OW.stoneD }}>{GD.hit.sub}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ background: OW.water, color: OW.ivory, padding: '2px 6px', fontFamily: OW.px, fontSize: 8 }}>HP {GD.hit.fmv}</div>
                  <div style={{ background: OW.roof, color: OW.ivory, padding: '2px 6px', fontFamily: OW.px, fontSize: 8 }}>★ PSA10</div>
                  <div style={{ background: OW.ink, color: OW.ivory, padding: '2px 6px', fontFamily: OW.px, fontSize: 8 }}>SOLD {GD.hit.got}</div>
                </div>
              </div>
            </div>
          </OWTile>
        </div>

        <div style={{ padding: '16px 12px 4px', fontFamily: OW.px, fontSize: 8.5, color: OW.ivory, lineHeight: 1.7, background: OW.grass2, marginTop: 14 }}>
          † MnSTR FMV — the town crier's price, not the market's.<br/>
          † Cards are physical slabs sleeping in the vault.
        </div>
      </div>

      <OWBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// I · SPELLBOOK  (fantasy grimoire, aged parchment)
// ════════════════════════════════════════════════════════════════
const SB = {
  paper:  'oklch(0.86 0.06 75)',
  paper2: 'oklch(0.80 0.07 70)',
  paper3: 'oklch(0.72 0.08 65)',
  ink:    'oklch(0.22 0.04 50)',
  ink2:   'oklch(0.34 0.04 50)',
  ink3:   'oklch(0.48 0.04 55)',
  gold:   'oklch(0.62 0.14 80)',
  goldL:  'oklch(0.74 0.14 80)',
  crimson:'oklch(0.45 0.18 25)',
  forest: 'oklch(0.38 0.12 145)',
  display:'"Cinzel", "EB Garamond", serif',
  body:   '"EB Garamond", "Times New Roman", serif',
  cap:    '"Cinzel", serif',
};

function SBRule() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: SB.gold }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${SB.gold} 30%, ${SB.gold} 70%, transparent)` }}/>
      <span style={{ fontFamily: SB.body, fontSize: 14, fontStyle: 'italic', color: SB.gold }}>❦</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${SB.gold} 30%, ${SB.gold} 70%, transparent)` }}/>
    </div>
  );
}

function SBDrop({ letter, children }) {
  return (
    <p style={{ fontFamily: SB.body, fontSize: 14, color: SB.ink, lineHeight: 1.5, margin: 0, textAlign: 'justify' }}>
      <span style={{
        float: 'left', fontFamily: SB.display, fontSize: 48, lineHeight: 0.85,
        color: SB.crimson, marginRight: 6, marginTop: 4,
        textShadow: `1px 1px 0 ${SB.gold}33`,
      }}>{letter}</span>
      {children}
    </p>
  );
}

function SBBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'Tidings',  i: '❦' },
    { id: 'tiers',   t: 'Tomes',    i: '✚' },
    { id: 'wallets', t: 'Mages',    i: '♛' },
    { id: 'cards',   t: 'Bestiary', i: '◈' },
    { id: 'live',    t: 'Auguries', i: '☉' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: `linear-gradient(180deg, ${SB.paper2}, ${SB.paper3})`,
      borderTop: `1px solid ${SB.gold}`,
      boxShadow: `inset 0 1px 0 ${SB.goldL}`,
      fontFamily: SB.body,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, padding: '8px 6px 4px' }}>
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '6px 0',
              borderRight: i === tabs.length - 1 ? 'none' : `1px solid ${SB.gold}55`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, color: on ? SB.crimson : SB.ink2 }}>{t.i}</span>
              <span style={{
                fontFamily: SB.cap, fontSize: 9, letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: on ? SB.ink : SB.ink3,
              }}>{t.t}</span>
              {on && <span style={{ position: 'absolute', bottom: -1, left: '25%', right: '25%', height: 1, background: SB.crimson }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SBPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: SB.paper,
      backgroundImage: `
        radial-gradient(circle at 25% 15%, oklch(0.94 0.04 80 / 0.4), transparent 40%),
        radial-gradient(circle at 80% 80%, oklch(0.70 0.08 60 / 0.35), transparent 50%),
        radial-gradient(circle at 50% 110%, oklch(0.60 0.08 50 / 0.4), transparent 50%),
        repeating-radial-gradient(circle at 30% 60%, oklch(0.78 0.06 70 / 0.06) 0 1px, transparent 1px 4px)
      `,
      color: SB.ink, fontFamily: SB.body, overflow: 'hidden',
    }}>
      {/* page border */}
      <div style={{
        position: 'absolute', inset: 14, top: 50, bottom: 100,
        border: `1px solid ${SB.gold}88`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', inset: 18, top: 54, bottom: 104,
        border: `1px dashed ${SB.gold}55`,
        pointerEvents: 'none',
      }}/>

      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Folio top */}
        <div style={{ paddingTop: 60, padding: '60px 30px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: SB.cap, fontSize: 9, letterSpacing: '0.36em', color: SB.gold }}>
            FOLIO · XVIII · V · MMXXVI
          </div>
          <div style={{ fontFamily: SB.display, fontSize: 30, fontWeight: 500, letterSpacing: '0.04em', marginTop: 10, color: SB.crimson, textShadow: `1px 1px 0 ${SB.gold}44` }}>
            Mn∙Str
          </div>
          <div style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 13, color: SB.ink2, marginTop: 4 }}>
            ~ a daily grimoire of pulls ~
          </div>
          <div style={{ marginTop: 14 }}><SBRule/></div>
        </div>

        {/* Opening — illuminated */}
        <div style={{ padding: '18px 30px 0' }}>
          <SBDrop letter="O">
            <span>n this day, four hundred &amp; twelve seekers turned the great wheel. The vault sang with $184,500 in coin, and one among them, a mage called </span>
            <span style={{ fontStyle: 'italic', color: SB.crimson }}>@phantasmagore</span>
            <span>, drew forth a verdant relic of the second aeon.</span>
          </SBDrop>
        </div>

        {/* Featured incantation */}
        <div style={{ padding: '22px 30px 0' }}>
          <SBRule/>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontFamily: SB.cap, fontSize: 9, letterSpacing: '0.32em', color: SB.gold }}>RELIC OF THE DAY</div>
            <div style={{ fontFamily: SB.display, fontStyle: 'italic', fontSize: 22, marginTop: 8, color: SB.ink }}>
              Shining Celebi
            </div>
            <div style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 12, color: SB.ink3, marginTop: 2 }}>
              first impression · neo destiny · MMII
            </div>
          </div>
          <div style={{
            margin: '14px auto 0',
            width: 150,
            position: 'relative',
            padding: 10,
            background: `linear-gradient(135deg, ${SB.goldL}, ${SB.gold}, ${SB.goldL})`,
            border: `1px solid ${SB.ink2}`,
          }}>
            <div style={{
              aspectRatio: '5/7',
              background: `
                radial-gradient(circle at 30% 25%, ${SB.crimson}55, transparent 50%),
                repeating-linear-gradient(135deg, oklch(0.42 0.08 50) 0 6px, oklch(0.36 0.07 50) 6px 12px)
              `,
              border: `1px solid ${SB.ink}`,
              position: 'relative',
            }}>
              {/* stained-glass cross */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: SB.gold }}/>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: SB.gold }}/>
              <div style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: 22, height: 22, borderRadius: '50%',
                background: SB.gold, border: `1px solid ${SB.ink}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: SB.display, fontSize: 12, color: SB.ink }}>❦</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 12, color: SB.ink3 }}>appraised at</div>
            <div style={{ fontFamily: SB.display, fontSize: 26, color: SB.crimson, marginTop: 2 }}>{GD.hit.fmv}</div>
            <div style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 12, color: SB.ink3, marginTop: 2 }}>
              redeemed for {GD.hit.got}
            </div>
          </div>
        </div>

        {/* Ledger of the day */}
        <div style={{ padding: '22px 30px 0' }}>
          <SBRule/>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontFamily: SB.cap, fontSize: 9, letterSpacing: '0.32em', color: SB.gold }}>THE DAY'S LEDGER</div>
          </div>
          <div style={{ marginTop: 14 }}>
            {GD.kpis.map((k, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                alignItems: 'baseline', padding: '8px 0',
                borderBottom: `1px dotted ${SB.ink3}`,
              }}>
                <span style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 14, color: SB.ink2 }}>
                  {{
                    'PACKS  24H': 'wheels turned',
                    'USDM   24H': 'coin offered',
                    'PAYOUT 24H': 'coin returned',
                    'WALLETS':   'mages present',
                  }[k.l]}
                </span>
                <span style={{ fontFamily: SB.display, fontSize: 18, color: SB.ink }}>{k.v}</span>
                <span style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 11, color: k.dn ? SB.crimson : SB.forest }}>{k.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier scrolls */}
        <div style={{ padding: '22px 30px 0' }}>
          <SBRule/>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontFamily: SB.cap, fontSize: 9, letterSpacing: '0.32em', color: SB.gold }}>THREE COVENS</div>
          </div>
          {GD.tiers.map((t, i) => (
            <div key={t.n} style={{
              marginTop: 12,
              padding: 10,
              border: `1px solid ${SB.gold}88`,
              background: `${SB.paper2}88`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: SB.display, fontSize: 16, color: SB.ink }}>{t.n[0] + t.n.slice(1).toLowerCase()}</span>
                <span style={{ fontFamily: SB.body, fontStyle: 'italic', fontSize: 13, color: SB.ink2 }}>{t.p}</span>
              </div>
              <div style={{ marginTop: 6, height: 2, background: SB.ink3, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${t.bar}%`, background: SB.crimson }}/>
              </div>
              <div style={{ marginTop: 6, fontFamily: SB.body, fontStyle: 'italic', fontSize: 11, color: SB.ink3 }}>
                edge of the house · <span style={{ color: SB.gold, fontStyle: 'normal' }}>{t.e}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Closing rubric */}
        <div style={{ padding: '22px 30px 4px' }}>
          <SBRule/>
          <div style={{ marginTop: 12, fontFamily: SB.body, fontStyle: 'italic', fontSize: 12, color: SB.ink3, textAlign: 'center', lineHeight: 1.6 }}>
            ❦ MnStr's appraisals are scribed by the vault, not the market.<br/>
            ❦ Relics are corporeal — they sleep in sealed slabs, not in chains.
          </div>
        </div>
      </div>

      <SBBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

Object.assign(window, { DMPulse, RGPulse, PCPulse, OWPulse, SBPulse });
