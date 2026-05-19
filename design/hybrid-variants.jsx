// MnStr — handheld × overworld hybrids
//   J · Pocket Overworld   (Overworld structure, DMG palette + chrome)
//   K · Tile Town          (Map IS the dashboard; KPIs as signposts)
//   L · Cartridge          (Handheld emulator vibe; cycling dialog)

// ────────────────────────────────────────────────────────────────
// Shared palette + helpers — enriched 4-color handheld
// ────────────────────────────────────────────────────────────────
const HY = {
  paper:  'oklch(0.92 0.05 95)',
  paper2: 'oklch(0.84 0.07 90)',
  grass:  'oklch(0.66 0.12 130)',
  grass2: 'oklch(0.52 0.11 135)',
  forest: 'oklch(0.32 0.08 142)',
  ink:    'oklch(0.18 0.05 140)',
  amber:  'oklch(0.74 0.14 70)',
  amberD: 'oklch(0.52 0.14 55)',
  water:  'oklch(0.54 0.10 200)',
  waterL: 'oklch(0.72 0.09 205)',
  path:   'oklch(0.78 0.06 80)',
  pathD:  'oklch(0.60 0.07 75)',
  px:     '"Silkscreen", "VT323", ui-monospace, monospace',
  pxR:    '"Pixelify Sans", "Silkscreen", ui-monospace, monospace',
};

function HYPanel({ children, style = {}, color = HY.paper }) {
  return (
    <div style={{
      background: color,
      border: `3px solid ${HY.ink}`,
      boxShadow: `inset 0 0 0 2px ${HY.paper2}, 3px 3px 0 0 ${HY.ink}`,
      ...style,
    }}>{children}</div>
  );
}

function HYDialog({ title, color = HY.ink, children, style = {} }) {
  return (
    <div style={{
      background: HY.paper,
      border: `3px solid ${HY.ink}`,
      boxShadow: `inset 0 0 0 2px ${HY.paper2}, 3px 3px 0 0 ${HY.ink}`,
      ...style,
    }}>
      <div style={{
        background: color, color: HY.paper,
        padding: '3px 10px',
        fontFamily: HY.px, fontSize: 10, letterSpacing: '0.1em',
      }}>{title}</div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

function HYBuilding({ roof = HY.amberD, w = 60, label, icon, value, glow }) {
  return (
    <div style={{ width: w, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* glow */}
      {glow && (
        <div style={{
          position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
          background: HY.amber + '55',
          zIndex: -1,
          animation: 'mnstr-pulse 2s ease-out infinite',
        }}/>
      )}
      {/* roof */}
      <div style={{
        width: 0, height: 0,
        borderLeft: `${w / 2}px solid transparent`,
        borderRight: `${w / 2}px solid transparent`,
        borderBottom: `${Math.floor(w * 0.35)}px solid ${roof}`,
        filter: `drop-shadow(2px 2px 0 ${HY.ink})`,
      }}/>
      {/* body */}
      <div style={{
        width: w - 6, height: w * 0.55,
        background: HY.paper,
        border: `3px solid ${HY.ink}`,
        boxShadow: `inset 0 0 0 2px ${HY.paper2}, 2px 2px 0 0 ${HY.ink}`,
        marginTop: -2,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* door */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 12, height: 14, background: HY.forest, border: `2px solid ${HY.ink}`,
        }}/>
        <span style={{ fontFamily: HY.px, fontSize: 14, color: HY.ink, marginTop: -8 }}>{icon}</span>
      </div>
      {/* label sign */}
      <div style={{
        marginTop: 5,
        background: HY.ink, color: HY.paper,
        padding: '2px 5px',
        fontFamily: HY.px, fontSize: 8, letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>{label}</div>
      {value && (
        <div style={{
          marginTop: 3,
          fontFamily: HY.px, fontSize: 9, color: HY.amberD,
          background: HY.paper, padding: '1px 4px',
          border: `2px solid ${HY.ink}`,
          whiteSpace: 'nowrap',
        }}>{value}</div>
      )}
    </div>
  );
}

function HYSignpost({ label, value, color = HY.amber, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 84, ...style }}>
      <div style={{
        background: HY.paper, color: HY.ink,
        border: `3px solid ${HY.ink}`,
        boxShadow: `2px 2px 0 0 ${HY.ink}`,
        padding: '4px 6px',
        fontFamily: HY.px,
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{ fontSize: 8, color: HY.forest, letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 12, color: color, marginTop: 2 }}>{value}</div>
      </div>
      <div style={{ width: 4, height: 14, background: HY.ink }}/>
    </div>
  );
}

function HYPlayer({ blink }) {
  return (
    <div style={{
      width: 16, height: 16,
      background: blink ? HY.amber : HY.paper,
      border: `2px solid ${HY.ink}`,
      boxShadow: `2px 2px 0 0 ${HY.ink}`,
      transition: '180ms',
    }}/>
  );
}

function HYBottomNav({ active, onChange }) {
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
      background: HY.ink,
      borderTop: `3px solid ${HY.paper2}`,
      fontFamily: HY.px,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, padding: '6px 4px 4px' }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '6px 0',
              background: on ? HY.paper : 'transparent',
              border: `2px solid ${on ? HY.paper : HY.paper2 + '55'}`,
              color: on ? HY.ink : HY.paper2,
              boxShadow: on ? `2px 2px 0 0 ${HY.amber}` : 'none',
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

function HYHeader({ title, sub, right }) {
  return (
    <div style={{
      background: HY.paper, color: HY.ink,
      border: `3px solid ${HY.ink}`,
      boxShadow: `inset 0 0 0 2px ${HY.paper2}, 2px 2px 0 0 ${HY.ink}`,
      padding: '6px 10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: HY.px,
    }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: '0.06em' }}>{title}</div>
        {sub && <div style={{ fontSize: 8, marginTop: 2, color: HY.forest }}>{sub}</div>}
      </div>
      {right && <div style={{ fontSize: 10, textAlign: 'right' }}>{right}</div>}
    </div>
  );
}

function HYGrassBg({ withPath = true, children, height }) {
  return (
    <div style={{
      position: 'relative',
      background: HY.grass,
      backgroundImage: `
        repeating-linear-gradient(0deg,  ${HY.grass2} 0 6px, transparent 6px 14px),
        repeating-linear-gradient(90deg, ${HY.grass2} 0 6px, transparent 6px 14px)
      `,
      backgroundSize: '14px 14px',
      border: `3px solid ${HY.ink}`,
      boxShadow: `2px 2px 0 0 ${HY.ink}`,
      height,
      overflow: 'hidden',
    }}>
      {withPath && (
        <>
          {/* horizontal path */}
          <div style={{
            position: 'absolute', top: '52%', left: -10, right: -10, height: 26,
            background: HY.path,
            borderTop: `3px solid ${HY.pathD}`, borderBottom: `3px solid ${HY.pathD}`,
            backgroundImage: `repeating-linear-gradient(90deg, ${HY.pathD} 0 4px, transparent 4px 14px)`,
            backgroundSize: '18px 4px', backgroundPosition: 'center',
            backgroundRepeat: 'repeat-x',
          }}/>
        </>
      )}
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// J · POCKET OVERWORLD  (DMG palette + Overworld structure)
// ════════════════════════════════════════════════════════════════
function HJPulse() {
  const [tab, setTab] = React.useState('pulse');
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 600);
    return () => clearInterval(id);
  }, []);
  const blink = t % 2 === 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: HY.paper2, color: HY.ink,
      fontFamily: HY.px, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Top status — handheld save header */}
        <div style={{ paddingTop: 56, padding: '56px 12px 0' }}>
          <HYHeader
            title="MnSTR · POCKET LEDGER"
            sub="18 MAY 2026 · CLEAR ☀"
            right={<>
              <div style={{ fontSize: 8, color: HY.forest }}>WALLET</div>
              <div style={{ fontSize: 11 }}>$184.5K</div>
            </>}
          />
        </div>

        {/* Map */}
        <div style={{ padding: '12px 12px 0' }}>
          <HYGrassBg height={260}>
            {/* water tile bottom-right */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 90, height: 50,
              background: HY.water, borderTop: `3px solid ${HY.waterL}`, borderLeft: `3px solid ${HY.ink}`,
              backgroundImage: `repeating-linear-gradient(0deg, ${HY.waterL} 0 2px, transparent 2px 8px)`,
            }}/>
            {/* trees */}
            {[ [10, 10], [50, 4], [320, 8], [340, 48] ].map(([x, y], i) => (
              <div key={i} style={{
                position: 'absolute', left: x, top: y,
                width: 16, height: 20,
                background: HY.forest,
                borderRadius: '50% 50% 30% 30%',
                border: `2px solid ${HY.ink}`,
                boxShadow: `1px 1px 0 0 ${HY.ink}`,
              }}/>
            ))}
            {/* buildings */}
            <div style={{ position: 'absolute', top: 22, left: 18 }}>
              <HYBuilding roof={HY.amberD} w={62} label="PACK SHOP" icon="$" value="412"/>
            </div>
            <div style={{ position: 'absolute', top: 12, left: 132 }}>
              <HYBuilding roof={HY.water}  w={62} label="GUILD"    icon="♛" value="189"/>
            </div>
            <div style={{ position: 'absolute', top: 22, right: 26 }}>
              <HYBuilding roof={HY.forest} w={62} label="DEX"      icon="✦" value="2,184" glow={blink}/>
            </div>
            {/* player on path */}
            <div style={{ position: 'absolute', top: '54%', left: 80, transform: 'translateY(-30%)' }}>
              <HYPlayer blink={blink}/>
            </div>
            <div style={{
              position: 'absolute', top: '52%', left: 102, marginTop: 8,
              fontFamily: HY.px, fontSize: 7, color: HY.paper,
              background: HY.ink, padding: '1px 3px',
            }}>YOU</div>
          </HYGrassBg>
        </div>

        {/* KPI 2x2 — dot-matrix tiles */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GD.kpis.map((k, i) => (
              <HYPanel key={i} style={{ padding: 10 }}>
                <div style={{ fontSize: 8, color: HY.forest }}>{k.l}</div>
                <div style={{ fontSize: 16, marginTop: 4 }}>{k.v}</div>
                <div style={{ fontSize: 8, marginTop: 2, color: k.dn ? HY.amberD : HY.grass2 }}>{k.d}</div>
              </HYPanel>
            ))}
          </div>
        </div>

        {/* Rare pull dialog */}
        <div style={{ padding: '12px 12px 0' }}>
          <HYDialog title="★ RARE PULL" color={HY.amberD}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
              <div style={{
                aspectRatio: '5/7',
                background: `
                  repeating-linear-gradient(45deg, ${HY.amber} 0 3px, ${HY.paper} 3px 6px)
                `,
                border: `2px solid ${HY.ink}`,
                boxShadow: `2px 2px 0 0 ${HY.ink}`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 2, left: 2, fontSize: 7, color: HY.ink, background: HY.paper, padding: '1px 2px' }}>PSA10</div>
                <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 9, color: HY.ink, background: HY.amber, padding: '1px 3px' }}>{GD.hit.fmv}</div>
              </div>
              <div style={{ fontFamily: HY.pxR }}>
                <div style={{ fontSize: 12 }}>{GD.hit.title}</div>
                <div style={{ fontSize: 9, marginTop: 4, color: HY.forest }}>{GD.hit.sub}</div>
                <div style={{ marginTop: 8, fontSize: 10 }}>► {GD.hit.who}</div>
                <div style={{ fontSize: 10, marginTop: 3 }}>► SOLD <span style={{ color: HY.amberD }}>{GD.hit.got}</span></div>
              </div>
            </div>
          </HYDialog>
        </div>

        {/* Live log */}
        <div style={{ padding: '12px 12px 0' }}>
          <HYDialog title="LIVE LOG" color={HY.forest} style={{ padding: 0 }}>
          </HYDialog>
          <div style={{ marginTop: -4, background: HY.paper, border: `3px solid ${HY.ink}`, borderTop: 'none', boxShadow: `3px 3px 0 0 ${HY.ink}`, padding: 0 }}>
            {GD.live.map((l, i) => (
              <div key={i} style={{
                padding: '5px 10px',
                borderTop: i === 0 ? 'none' : `2px dashed ${HY.paper2}`,
                fontFamily: HY.px, fontSize: 9.5,
                display: 'grid', gridTemplateColumns: '26px 56px 1fr auto', gap: 6,
                background: l.big ? HY.amber + '55' : 'transparent',
              }}>
                <span style={{ color: HY.forest }}>{l.t}</span>
                <span>{l.tier}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.who}</span>
                <span style={{ color: l.big ? HY.amberD : HY.ink }}>{l.amt}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 12px 4px', fontFamily: HY.px, fontSize: 8, color: HY.forest, lineHeight: 1.7 }}>
          † MnSTR FMV. NOT MARKET CONSENSUS.<br/>
          † CARDS ARE PHYSICAL SLABS. NOT NFTS.
        </div>
      </div>

      <HYBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// K · TILE TOWN  (map IS the dashboard; KPIs as signposts)
// ════════════════════════════════════════════════════════════════
function HKPulse() {
  const [tab, setTab] = React.useState('pulse');
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 600);
    return () => clearInterval(id);
  }, []);
  const blink = t % 2 === 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: HY.ink, color: HY.paper,
      fontFamily: HY.px, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Marquee top status */}
        <div style={{ paddingTop: 56, padding: '56px 12px 0' }}>
          <div style={{
            background: HY.ink, color: HY.paper,
            border: `3px solid ${HY.paper}`,
            padding: '4px 10px',
            fontFamily: HY.px, fontSize: 9, letterSpacing: '0.1em',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span><span style={{ color: HY.amber }}>●</span> {blink ? 'LIVE' : '    '} ·  18 MAY · 18:42</span>
            <span style={{ color: HY.amber }}>$184.5K</span>
          </div>
        </div>

        {/* THE MAP — everything happens here */}
        <div style={{ padding: '10px 12px 0' }}>
          <HYGrassBg height={500}>
            {/* river top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 36,
              background: HY.water,
              borderBottom: `3px solid ${HY.waterL}`,
              backgroundImage: `repeating-linear-gradient(0deg, ${HY.waterL} 0 2px, transparent 2px 8px)`,
            }}/>
            {/* bridge */}
            <div style={{
              position: 'absolute', top: 0, left: 170, width: 38, height: 36,
              background: HY.path,
              borderLeft: `3px solid ${HY.pathD}`, borderRight: `3px solid ${HY.pathD}`,
            }}/>
            {/* sand path (vertical) */}
            <div style={{
              position: 'absolute', top: 36, left: 170, width: 38, bottom: 0,
              background: HY.path,
              borderLeft: `3px solid ${HY.pathD}`, borderRight: `3px solid ${HY.pathD}`,
              backgroundImage: `repeating-linear-gradient(0deg, ${HY.pathD} 0 4px, transparent 4px 14px)`,
              backgroundSize: '6px 18px', backgroundPosition: 'center',
            }}/>
            {/* horizontal branch */}
            <div style={{
              position: 'absolute', top: 220, left: 0, right: 0, height: 26,
              background: HY.path,
              borderTop: `3px solid ${HY.pathD}`, borderBottom: `3px solid ${HY.pathD}`,
            }}/>

            {/* trees scattered */}
            {[ [12, 60], [40, 96], [330, 70], [340, 130], [16, 380], [330, 380], [40, 460] ].map(([x, y], i) => (
              <div key={i} style={{
                position: 'absolute', left: x, top: y,
                width: 16, height: 20,
                background: HY.forest,
                borderRadius: '50% 50% 30% 30%',
                border: `2px solid ${HY.ink}`,
                boxShadow: `1px 1px 0 0 ${HY.ink}`,
              }}/>
            ))}

            {/* signposts — KPIs as world objects */}
            <div style={{ position: 'absolute', top: 56, left: 12 }}>
              <HYSignpost label="PACKS 24h"   value="412"     color={HY.amberD}/>
            </div>
            <div style={{ position: 'absolute', top: 56, right: 12 }}>
              <HYSignpost label="USDM 24h"    value="$184.5K" color={HY.amberD}/>
            </div>
            <div style={{ position: 'absolute', top: 260, left: 12 }}>
              <HYSignpost label="PAID OUT"    value="$67.8K"  color={HY.amberD}/>
            </div>
            <div style={{ position: 'absolute', top: 260, right: 12 }}>
              <HYSignpost label="TRAINERS"    value="189"     color={HY.amberD}/>
            </div>

            {/* buildings */}
            <div style={{ position: 'absolute', top: 130, left: 24 }}>
              <HYBuilding roof={HY.amberD} w={62} label="PACK SHOP" icon="$"/>
            </div>
            <div style={{ position: 'absolute', top: 130, right: 24 }}>
              <HYBuilding roof={HY.water}  w={62} label="GUILD"    icon="♛"/>
            </div>
            <div style={{ position: 'absolute', top: 340, left: 24 }}>
              <HYBuilding roof={HY.forest} w={62} label="DEX"      icon="✦"/>
            </div>
            <div style={{ position: 'absolute', top: 340, right: 24 }}>
              <HYBuilding roof={HY.amberD} w={62} label="LIVE TOWER" icon="◉" glow={blink}/>
            </div>

            {/* exclamation over Live tower */}
            <div style={{
              position: 'absolute', top: 320, right: 50,
              fontFamily: HY.px, fontSize: 18, color: HY.amber,
              textShadow: `2px 2px 0 ${HY.ink}`,
              opacity: blink ? 1 : 0.3,
              transition: '180ms',
            }}>!</div>

            {/* player on path */}
            <div style={{ position: 'absolute', top: 222, left: 144 }}>
              <HYPlayer blink={blink}/>
            </div>
          </HYGrassBg>
        </div>

        {/* Encounter dialog (overlays bottom) */}
        <div style={{ padding: '12px 12px 0' }}>
          <HYDialog title="!  ENCOUNTER" color={HY.amberD}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
              <div style={{
                aspectRatio: '5/7',
                background: `repeating-linear-gradient(45deg, ${HY.amber} 0 3px, ${HY.paper} 3px 6px)`,
                border: `2px solid ${HY.ink}`,
                boxShadow: `2px 2px 0 0 ${HY.ink}`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 8, color: HY.ink, background: HY.amber, padding: '1px 3px' }}>HP {GD.hit.fmv}</div>
              </div>
              <div style={{ fontFamily: HY.pxR }}>
                <div style={{ fontSize: 12, lineHeight: 1.3 }}>"A wild {GD.hit.title.toLowerCase()} appeared!"</div>
                <div style={{ marginTop: 6, fontFamily: HY.px, fontSize: 9, color: HY.forest }}>caught by {GD.hit.who}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <div style={{ background: HY.amberD, color: HY.paper, padding: '2px 6px', fontFamily: HY.px, fontSize: 8 }}>SOLD</div>
                  <div style={{ background: HY.ink, color: HY.paper, padding: '2px 6px', fontFamily: HY.px, fontSize: 8 }}>+{GD.hit.got}</div>
                </div>
              </div>
            </div>
          </HYDialog>
        </div>

        {/* Live ticker — small strip */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{
            background: HY.ink, color: HY.paper,
            border: `3px solid ${HY.paper2}`,
            padding: '6px 10px',
            fontFamily: HY.px, fontSize: 9.5, lineHeight: 1.7,
            overflow: 'hidden',
          }}>
            <div style={{ color: HY.amber, fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}>↦ TOWN CRIER · LIVE</div>
            {GD.live.slice(0, 4).map((l, i) => (
              <div key={i} style={{ color: l.big ? HY.amber : HY.paper2 }}>
                [{l.t}] <span style={{ color: HY.paper }}>{l.who}</span> · {l.act} {l.amt}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 12px 4px', fontFamily: HY.px, fontSize: 8, color: HY.paper2, lineHeight: 1.7 }}>
          † MnSTR FMV — the town crier's price.<br/>
          † Slabs sleep in the Vault. Not NFTs.
        </div>
      </div>

      <HYBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// L · CARTRIDGE  (handheld emulator vibe; cycling dialog)
// ════════════════════════════════════════════════════════════════
function HLPulse() {
  const [tab, setTab] = React.useState('pulse');
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 700);
    return () => clearInterval(id);
  }, []);
  const blink = t % 2 === 0;

  // Cycling dialog content: 0 = stats, 1 = rare drop, 2 = live
  const dialogSlot = Math.floor(t / 5) % 3;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: HY.paper2, color: HY.ink,
      fontFamily: HY.px, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>

        {/* "Cartridge" frame label */}
        <div style={{ paddingTop: 56, padding: '56px 14px 0', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: HY.ink, color: HY.amber,
            padding: '3px 12px',
            fontFamily: HY.px, fontSize: 9, letterSpacing: '0.2em',
            border: `2px solid ${HY.paper2}`,
            boxShadow: `2px 2px 0 0 ${HY.paper}`,
          }}>
            ▮  MnSTR · POCKET v0.4  ▮
          </div>
        </div>

        {/* HP/MP/EXP status row */}
        <div style={{ padding: '12px 14px 0' }}>
          <HYPanel style={{ padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px', rowGap: 6, columnGap: 8, alignItems: 'center', fontFamily: HY.px, fontSize: 10 }}>
              <span style={{ color: HY.amberD }}>VOL</span>
              <div style={{ height: 8, border: `2px solid ${HY.ink}`, background: HY.paper2, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '78%', background: HY.amber }}/>
              </div>
              <span style={{ textAlign: 'right' }}>$184K</span>

              <span style={{ color: HY.amberD }}>PKS</span>
              <div style={{ height: 8, border: `2px solid ${HY.ink}`, background: HY.paper2, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '62%', background: HY.forest }}/>
              </div>
              <span style={{ textAlign: 'right' }}>412</span>

              <span style={{ color: HY.amberD }}>WLT</span>
              <div style={{ height: 8, border: `2px solid ${HY.ink}`, background: HY.paper2, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '48%', background: HY.water }}/>
              </div>
              <span style={{ textAlign: 'right' }}>189</span>
            </div>
          </HYPanel>
        </div>

        {/* Mini-map viewport */}
        <div style={{ padding: '12px 14px 0' }}>
          <div style={{ position: 'relative' }}>
            <HYGrassBg height={170}>
              {/* small water */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 70, height: 38,
                background: HY.water, borderTop: `3px solid ${HY.waterL}`, borderLeft: `3px solid ${HY.ink}`,
              }}/>
              {[ [16, 16], [44, 6], [320, 12], [340, 50], [12, 130] ].map(([x, y], i) => (
                <div key={i} style={{
                  position: 'absolute', left: x, top: y,
                  width: 12, height: 14,
                  background: HY.forest,
                  borderRadius: '50% 50% 30% 30%',
                  border: `2px solid ${HY.ink}`,
                }}/>
              ))}
              <div style={{ position: 'absolute', top: 26, left: 18 }}>
                <HYBuilding roof={HY.amberD} w={44} label="SHOP" icon="$"/>
              </div>
              <div style={{ position: 'absolute', top: 22, left: 130 }}>
                <HYBuilding roof={HY.water} w={44} label="GUILD" icon="♛"/>
              </div>
              <div style={{ position: 'absolute', top: 26, right: 92 }}>
                <HYBuilding roof={HY.forest} w={44} label="DEX" icon="✦" glow={blink}/>
              </div>
              <div style={{ position: 'absolute', top: '54%', left: 70 }}>
                <HYPlayer blink={blink}/>
              </div>
            </HYGrassBg>
            {/* viewport label */}
            <div style={{
              position: 'absolute', top: -8, left: 8,
              background: HY.paper, color: HY.ink,
              padding: '1px 6px',
              fontFamily: HY.px, fontSize: 9, letterSpacing: '0.1em',
              border: `2px solid ${HY.ink}`,
            }}>VIEWPORT</div>
            <div style={{
              position: 'absolute', top: -8, right: 8,
              background: HY.ink, color: HY.amber,
              padding: '1px 6px',
              fontFamily: HY.px, fontSize: 9, letterSpacing: '0.1em',
            }}>{blink ? '●' : '○'} LIVE</div>
          </div>
        </div>

        {/* Cycling dialog */}
        <div style={{ padding: '14px 14px 0' }}>
          <HYDialog title={dialogSlot === 0 ? '◆ STATUS' : dialogSlot === 1 ? '★ RARE DROP' : '↦ TOWN CRIER'} color={dialogSlot === 1 ? HY.amberD : HY.ink}>
            {dialogSlot === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: HY.px }}>
                {GD.kpis.map((k, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 8, color: HY.forest }}>{k.l}</div>
                    <div style={{ fontSize: 13, marginTop: 3 }}>{k.v}</div>
                    <div style={{ fontSize: 8, marginTop: 1, color: k.dn ? HY.amberD : HY.grass2 }}>{k.d}</div>
                  </div>
                ))}
              </div>
            )}
            {dialogSlot === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 10 }}>
                <div style={{
                  aspectRatio: '5/7',
                  background: `repeating-linear-gradient(45deg, ${HY.amber} 0 3px, ${HY.paper} 3px 6px)`,
                  border: `2px solid ${HY.ink}`,
                  boxShadow: `2px 2px 0 0 ${HY.ink}`,
                  position: 'relative',
                }}>
                  <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 8, color: HY.ink, background: HY.amber, padding: '1px 3px' }}>{GD.hit.fmv}</div>
                </div>
                <div style={{ fontFamily: HY.pxR }}>
                  <div style={{ fontSize: 11, lineHeight: 1.3 }}>{GD.hit.title}</div>
                  <div style={{ fontSize: 9, marginTop: 4, color: HY.forest, fontFamily: HY.px }}>{GD.hit.sub}</div>
                  <div style={{ fontSize: 10, marginTop: 6, fontFamily: HY.px }}>► {GD.hit.who}</div>
                  <div style={{ fontSize: 10, marginTop: 2, fontFamily: HY.px }}>► SOLD <span style={{ color: HY.amberD }}>{GD.hit.got}</span></div>
                </div>
              </div>
            )}
            {dialogSlot === 2 && (
              <div style={{ fontFamily: HY.px, fontSize: 10, lineHeight: 1.7 }}>
                {GD.live.slice(0, 5).map((l, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '24px 50px 1fr auto', gap: 6,
                    color: l.big ? HY.amberD : HY.ink,
                  }}>
                    <span style={{ color: HY.forest }}>{l.t}</span>
                    <span>{l.tier}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.who}</span>
                    <span>{l.amt}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6,
                  background: i === dialogSlot ? HY.ink : HY.paper2,
                  border: `1px solid ${HY.ink}`,
                }}/>
              ))}
            </div>
          </HYDialog>
        </div>

        {/* Pack rates compact */}
        <div style={{ padding: '12px 14px 0' }}>
          <HYPanel style={{ padding: 0 }}>
            <div style={{
              background: HY.ink, color: HY.paper,
              padding: '3px 10px',
              fontFamily: HY.px, fontSize: 9, letterSpacing: '0.1em',
            }}>◆ PACK SHOP</div>
            <div style={{ padding: '8px 10px' }}>
              {GD.tiers.map((tt, i) => (
                <div key={tt.n} style={{
                  display: 'grid', gridTemplateColumns: '64px 1fr 50px 50px', gap: 8,
                  alignItems: 'center',
                  fontFamily: HY.px, fontSize: 10,
                  padding: '4px 0',
                  borderTop: i === 0 ? 'none' : `1px dashed ${HY.paper2}`,
                }}>
                  <span>{tt.n}</span>
                  <div style={{ height: 6, background: HY.paper2, border: `2px solid ${HY.ink}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${tt.bar}%`, background: HY.amberD }}/>
                  </div>
                  <span style={{ textAlign: 'right' }}>{tt.p}</span>
                  <span style={{ color: HY.amberD, textAlign: 'right' }}>{tt.e}</span>
                </div>
              ))}
            </div>
          </HYPanel>
        </div>

        {/* "Press A" prompt */}
        <div style={{ padding: '12px 14px 0', textAlign: 'center' }}>
          <span style={{
            fontFamily: HY.px, fontSize: 10, color: HY.forest, letterSpacing: '0.1em',
          }}>
            ▶ PRESS{blink ? '  ▮' : ''} TO INTERACT
          </span>
        </div>

        <div style={{ padding: '12px 14px 4px', fontFamily: HY.px, fontSize: 8, color: HY.forest, lineHeight: 1.7 }}>
          † MnSTR FMV. NOT MARKET CONSENSUS.<br/>
          † SLABS · PHYSICAL · NOT NFTS.
        </div>
      </div>

      <HYBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

Object.assign(window, { HJPulse, HKPulse, HLPulse });
