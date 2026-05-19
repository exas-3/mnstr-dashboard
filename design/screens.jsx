// MnStr — mobile screens
// Single self-contained file with all surfaces. Each <AppScreen start="…" />
// hosts a working bottom nav so any frame can be tapped through independently.

const P = {
  bg:   'oklch(0.155 0.008 70)',
  bg2:  'oklch(0.185 0.008 70)',
  bg3:  'oklch(0.215 0.008 70)',
  line: 'oklch(0.30 0.008 70)',
  lineSoft: 'oklch(0.245 0.008 70)',
  fg:   'oklch(0.95 0.008 85)',
  fg2:  'oklch(0.78 0.008 85)',
  fg3:  'oklch(0.58 0.008 85)',
  fg4:  'oklch(0.42 0.008 85)',
  amber:'oklch(0.82 0.16 85)',
  amberD:'oklch(0.62 0.14 85)',
  mint: 'oklch(0.82 0.14 165)',
  mag:  'oklch(0.72 0.18 340)',
  blue: 'oklch(0.72 0.14 240)',
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────

function Mono({ children, style = {}, ...r }) {
  return <span style={{ fontFamily: P.mono, fontVariantNumeric: 'tabular-nums', ...style }} {...r}>{children}</span>;
}

function Lbl({ children, color = P.fg3, style = {} }) {
  return (
    <div style={{
      fontFamily: P.mono, fontSize: 9.5, letterSpacing: '0.16em',
      textTransform: 'uppercase', color, ...style,
    }}>{children}</div>
  );
}

function SectionHead({ tag, title, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '20px 16px 10px',
    }}>
      <span style={{ fontFamily: P.mono, fontSize: 9.5, color: P.amber, letterSpacing: '0.18em' }}>{tag}</span>
      <span style={{ fontFamily: P.sans, fontSize: 14, color: P.fg, letterSpacing: '-0.01em' }}>{title}</span>
      {right && <span style={{ marginLeft: 'auto', fontFamily: P.mono, fontSize: 9.5, color: P.fg4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{right}</span>}
    </div>
  );
}

function TierTag({ tier, style = {} }) {
  const m = {
    Starter: { c: P.blue,  l: 'S' },
    Premium: { c: P.amber, l: 'M' },
    Ultra:   { c: P.mag,   l: 'U' },
  }[tier] || { c: P.fg3, l: '·' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 6px', border: `1px solid ${m.c}55`,
      background: `${m.c}11`,
      fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: m.c, ...style,
    }}>
      <span style={{ width: 5, height: 5, background: m.c }} />
      {tier}
    </span>
  );
}

function StatusPill({ status }) {
  const m = {
    holding:   { c: P.mint, t: 'HOLDING' },
    sold_back: { c: P.mag,  t: 'SOLD' },
    redeemed:  { c: P.blue, t: 'REDEEMED' },
  }[status] || { c: P.fg3, t: status?.toUpperCase() || '—' };
  return (
    <span style={{
      fontFamily: P.mono, fontSize: 9, letterSpacing: '0.1em',
      padding: '2px 6px', border: `1px solid ${m.c}55`,
      color: m.c, background: `${m.c}10`,
    }}>{m.t}</span>
  );
}

function CardSlot({ fmv, psa = 'PSA 10', tier, hot, chase, label, h = 168, captionTier }) {
  // 5:7 ratio. Image is a striped placeholder; in production this is <img>
  // from cdn.mnstr.xyz with the title overlay below the image area.
  const w = (h * 5) / 7;
  return (
    <div style={{
      width: '100%',
      aspectRatio: '5/7',
      background: 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)',
      border: `1px solid ${hot ? P.amber + '88' : P.line}`,
      boxShadow: hot ? `0 0 0 1px ${P.amber}22, 0 0 22px ${P.amber}1f` : 'none',
      position: 'relative',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 7,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Mono style={{ fontSize: 8.5, color: P.amber, letterSpacing: '0.1em' }}>{psa}</Mono>
        {chase && <Mono style={{ fontSize: 8.5, color: P.mag, letterSpacing: '0.12em' }}>CHASE</Mono>}
      </div>
      <div>
        {label && <div style={{ fontFamily: P.mono, fontSize: 9, color: P.fg3, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Mono style={{ fontSize: 13, color: P.fg }}>${fmv}</Mono>
          {captionTier && <TierTag tier={captionTier} style={{ padding: '1px 4px', fontSize: 7.5 }} />}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ pts, color = P.mint, w = 60, h = 18 }) {
  if (!pts || !pts.length) return null;
  const max = Math.max(...pts), min = Math.min(...pts);
  const dx = w / (pts.length - 1);
  const d = pts.map((v, i) => {
    const x = i * dx;
    const y = h - ((v - min) / Math.max(1e-9, max - min)) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Shell — top bar + bottom tab nav
// ─────────────────────────────────────────────────────────────

function TopBar({ title, sub, onSearch, onInfo }) {
  return (
    <div style={{
      paddingTop: 54, paddingLeft: 12, paddingRight: 12, paddingBottom: 10,
      background: `${P.bg}f0`,
      borderBottom: `1px solid ${P.lineSoft}`,
      position: 'sticky', top: 0, zIndex: 20,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 16, height: 16, borderRadius: 3,
          background: `linear-gradient(135deg, ${P.amber}, oklch(0.6 0.16 60))`,
          boxShadow: `0 0 10px ${P.amber}66`,
        }} />
        <Mono style={{ fontSize: 11, letterSpacing: '0.16em', color: P.fg }}>MNSTR</Mono>
        <Mono style={{ fontSize: 10, color: P.fg4, letterSpacing: '0.1em' }}>/ {title}</Mono>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.mint, boxShadow: `0 0 8px ${P.mint}` }} />
          <Mono style={{ fontSize: 9, color: P.fg3, letterSpacing: '0.12em', marginRight: 4 }}>LIVE</Mono>
          {onSearch && <IconBtn icon={SearchIcon} onClick={onSearch} ariaLabel="Search"/>}
          {onInfo   && <IconBtn icon={InfoIcon}   onClick={onInfo}   ariaLabel="Caveats"/>}
        </div>
      </div>
      {sub && (
        <div style={{ marginTop: 6 }}>
          <Mono style={{ fontSize: 10, color: P.fg3, letterSpacing: '0.12em' }}>{sub}</Mono>
        </div>
      )}
    </div>
  );
}

function NavIcon({ name, active }) {
  const c = active ? P.amber : P.fg3;
  const sw = 1.4;
  const ic = {
    pulse:   <polyline points="3,12 7,12 10,7 13,16 16,10 21,10" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>,
    tiers:   <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7"/>
              <line x1="4" y1="12" x2="16" y2="12"/>
              <line x1="4" y1="17" x2="12" y2="17"/>
             </g>,
    wallets: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="7" width="16" height="11" rx="1.5"/>
              <path d="M4 10 L14 5 L20 7"/>
              <circle cx="16" cy="13" r="1.2" fill={c}/>
             </g>,
    cards:   <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round">
              <rect x="7" y="4" width="11" height="15" rx="1"/>
              <rect x="3" y="7" width="11" height="15" rx="1" fill={active ? c+'22' : 'transparent'}/>
             </g>,
    live:    <g>
              <circle cx="12" cy="12" r="3" fill={c}/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke={c} strokeWidth={sw} opacity="0.55"/>
              <circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth={sw} opacity="0.25"/>
             </g>,
  }[name];
  return <svg width="22" height="22" viewBox="0 0 24 24">{ic}</svg>;
}

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   t: 'Pulse' },
    { id: 'tiers',   t: 'Tiers' },
    { id: 'wallets', t: 'Wallets' },
    { id: 'cards',   t: 'Cards' },
    { id: 'live',    t: 'Live' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: `${P.bg}ee`,
      borderTop: `1px solid ${P.lineSoft}`,
      backdropFilter: 'blur(14px)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '8px 4px 4px',
      }}>
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                all: 'unset', cursor: 'pointer', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '6px 0',
                position: 'relative',
              }}>
              {on && <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 16, height: 2, background: P.amber, boxShadow: `0 0 8px ${P.amber}`,
              }}/>}
              <NavIcon name={tab.id} active={on}/>
              <Mono style={{ fontSize: 9, letterSpacing: '0.1em', color: on ? P.amber : P.fg3, textTransform: 'uppercase' }}>{tab.t}</Mono>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Shell({ active, onNav, title, sub, children, onSearch, onInfo, overlay }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: P.bg,
      color: P.fg, fontFamily: P.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 96 }}>
        <TopBar title={title} sub={sub} onSearch={onSearch} onInfo={onInfo} />
        {children}
      </div>
      <BottomNav active={active} onChange={onNav} />
      {overlay}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PULSE
// ─────────────────────────────────────────────────────────────

function KpiTile({ label, value, unit, delta, deltaDown }) {
  return (
    <div style={{
      background: P.bg2, border: `1px solid ${P.lineSoft}`,
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 5,
      minHeight: 72,
    }}>
      <Lbl style={{ fontSize: 8.5, letterSpacing: '0.14em' }}>{label}</Lbl>
      <div style={{ fontFamily: P.mono, fontSize: 18, color: P.fg, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
        {value}{unit && <span style={{ color: P.fg3, fontSize: 12, marginLeft: 2 }}>{unit}</span>}
      </div>
      {delta && (
        <Mono style={{ fontSize: 9.5, color: deltaDown ? P.mag : P.mint }}>
          {deltaDown ? '↓' : '↑'} {delta}
        </Mono>
      )}
    </div>
  );
}

function VelocityChart() {
  // Compact stacked area, 3 tiers, ~110px tall
  return (
    <div style={{
      background: P.bg2, border: `1px solid ${P.lineSoft}`,
      margin: '0 12px',
    }}>
      <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'baseline' }}>
        <Lbl>Velocity · 30d</Lbl>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <Mono style={{ fontSize: 8.5, color: P.blue }}>● Starter</Mono>
          <Mono style={{ fontSize: 8.5, color: P.amber }}>● Premium</Mono>
          <Mono style={{ fontSize: 8.5, color: P.mag }}>● Ultra</Mono>
        </div>
      </div>
      <svg viewBox="0 0 360 120" preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
        <defs>
          <linearGradient id="vS" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.5"/>
            <stop offset="1" stopColor="oklch(0.72 0.14 240)" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="vP" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.55"/>
            <stop offset="1" stopColor="oklch(0.82 0.16 85)" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="vU" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.55"/>
            <stop offset="1" stopColor="oklch(0.72 0.18 340)" stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        <g stroke={P.lineSoft} strokeDasharray="2 4">
          <line x1="0" y1="30" x2="360" y2="30"/>
          <line x1="0" y1="60" x2="360" y2="60"/>
          <line x1="0" y1="90" x2="360" y2="90"/>
        </g>
        <path d="M0,118 L0,92 C40,90 80,86 120,86 C160,84 200,78 240,76 C280,72 320,68 360,64 L360,118 Z" fill="url(#vS)"/>
        <path d="M0,92 C40,90 80,86 120,86 C160,84 200,78 240,76 C280,72 320,68 360,64 L360,46 C320,46 280,50 240,54 C200,58 160,62 120,64 C80,64 40,66 0,68 Z" fill="url(#vP)"/>
        <path d="M0,68 C40,66 80,64 120,64 C160,62 200,58 240,54 C280,50 320,46 360,46 L360,24 C320,24 280,28 240,30 C200,34 160,38 120,40 C80,42 40,44 0,46 Z" fill="url(#vU)"/>
        <path d="M0,92 C40,90 80,86 120,86 C160,84 200,78 240,76 C280,72 320,68 360,64" fill="none" stroke="oklch(0.72 0.14 240)" strokeWidth="1"/>
        <path d="M0,68 C40,66 80,64 120,64 C160,62 200,58 240,54 C280,50 320,46 360,46" fill="none" stroke={P.amber} strokeWidth="1.2"/>
        <path d="M0,46 C40,44 80,42 120,40 C160,38 200,34 240,30 C280,28 320,24 360,24" fill="none" stroke={P.mag} strokeWidth="1"/>
      </svg>
      <div style={{ padding: '4px 12px 10px', display: 'flex', justifyContent: 'space-between' }}>
        <Mono style={{ fontSize: 8.5, color: P.fg4 }}>−30d</Mono>
        <Mono style={{ fontSize: 8.5, color: P.fg4 }}>now</Mono>
      </div>
    </div>
  );
}

function TierStrip() {
  const tiers = [
    { tier: 'Starter', price: 50,   pulls: '28,418', ev: '$42.10', edge: '15.8%', bar: 62, c: P.blue },
    { tier: 'Premium', price: 250,  pulls: '9,873',  ev: '$206.40', edge: '17.4%', bar: 78, c: P.amber },
    { tier: 'Ultra',   price: 1250, pulls: '1,836',  ev: '$1,118', edge: '10.6%', bar: 91, c: P.mag },
  ];
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
      {tiers.map((t, i) => (
        <div key={t.tier} style={{
          padding: '10px 12px',
          borderTop: i === 0 ? 'none' : `1px solid ${P.lineSoft}`,
          display: 'grid', gridTemplateColumns: '70px 1fr 60px',
          gap: 12, alignItems: 'center',
        }}>
          <div>
            <TierTag tier={t.tier} />
            <Mono style={{ fontSize: 11, color: P.fg, marginTop: 5, display: 'block' }}>${t.price}</Mono>
          </div>
          <div>
            <div style={{ height: 3, background: P.bg3, position: 'relative' }}>
              <div style={{ height: '100%', width: `${t.bar}%`, background: t.c }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <Mono style={{ fontSize: 9, color: P.fg3 }}>{t.pulls} pulls</Mono>
              <Mono style={{ fontSize: 9, color: P.fg3 }}>EV {t.ev}</Mono>
            </div>
          </div>
          <Mono style={{ fontSize: 11, color: P.amber, textAlign: 'right' }}>{t.edge}</Mono>
        </div>
      ))}
    </div>
  );
}

function LiveTickerStrip() {
  const items = [
    { t: '14s', tier: 'Ultra',   who: '@phantasmagore', sub: '+$8,415 sold' },
    { t: '42s', tier: 'Premium', who: '@kage',          sub: 'holding · $312' },
    { t: '1m',  tier: 'Starter', who: '0x7c…91a4',      sub: 'holding · $35' },
    { t: '2m',  tier: 'Starter', who: '@yumi',          sub: 'sold · $29.75' },
    { t: '3m',  tier: 'Premium', who: '@aether',        sub: 'sold · $212' },
    { t: '4m',  tier: 'Starter', who: '0xbb…aa10',      sub: 'sold · $42' },
  ];
  return (
    <div style={{
      margin: '0 12px',
      display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
      scrollbarWidth: 'none',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          flex: '0 0 auto',
          background: P.bg2, border: `1px solid ${P.lineSoft}`,
          padding: '8px 10px', minWidth: 130,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mono style={{ fontSize: 9, color: P.fg4, letterSpacing: '0.1em' }}>{it.t} ago</Mono>
            <TierTag tier={it.tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
          </div>
          <div style={{ marginTop: 4, fontFamily: P.mono, fontSize: 10.5, color: P.fg, whiteSpace: 'nowrap' }}>{it.who}</div>
          <Mono style={{ fontSize: 9.5, color: P.amber, marginTop: 2 }}>{it.sub}</Mono>
        </div>
      ))}
    </div>
  );
}

function HitRow({ title, set, who, tier, fmv, hot }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '46px 1fr 60px',
      gap: 10, alignItems: 'center',
      padding: '8px 12px',
      borderTop: `1px dashed ${P.lineSoft}`,
    }}>
      <div style={{
        aspectRatio: '5/7',
        background: 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
        border: `1px solid ${hot ? P.amber + '88' : P.line}`,
      }}/>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: P.sans, fontSize: 12, color: P.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Mono style={{ fontSize: 9, color: P.fg3 }}>{set}</Mono>
          <span style={{ color: P.fg4 }}>·</span>
          <Mono style={{ fontSize: 9, color: P.fg3 }}>{who}</Mono>
          <TierTag tier={tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
        </div>
      </div>
      <Mono style={{ fontSize: 12, color: P.amber, textAlign: 'right' }}>${fmv}</Mono>
    </div>
  );
}

function PulseScreen({ onOpenCard, onOpenLive }) {
  const [tf, setTf] = React.useState('24H');
  const [showBanner, setShowBanner] = React.useState(true);

  return (
    <>
      {showBanner && (
        <BigHitBanner
          pull={{ ago: '14S AGO', title: 'Shining Celebi 1ed #106', who: '@phantasmagore', tier: 'ULTRA', fmv: '8,415' }}
          onTap={onOpenCard}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      <div style={{ padding: '14px 12px 0', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Mono style={{ fontSize: 9, color: P.amber, letterSpacing: '0.18em' }}>00 · NOW</Mono>
          <div style={{ fontFamily: P.sans, fontSize: 22, color: P.fg, marginTop: 4, letterSpacing: '-0.015em' }}>
            Today · 18 May
          </div>
          <Mono style={{ fontSize: 10, color: P.fg3, marginTop: 3, display: 'block' }}>UTC 18:42 · block 8,421,337 · +2 ago</Mono>
        </div>
        <TimePivot value={tf} onChange={setTf} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        padding: '12px 12px 0',
      }}>
        <KpiTile label={`Packs · ${tf}`} value="412" delta="+8.2%" />
        <KpiTile label={`USDm · ${tf}`} value="$184.5" unit="k" delta="+12.1%" />
        <KpiTile label={`Payouts · ${tf}`} value="$67.8" unit="k" delta="−3.4%" deltaDown />
        <KpiTile label={`Wallets · ${tf}`} value="189" delta="+18" />
        <KpiTile label="Packs · all-time" value="40,127" delta="cumulative" />
        <KpiTile label="USDm · all-time" value="$4.31" unit="M" delta="cumulative" />
      </div>

      <SectionHead tag="01 · VELOCITY" title="Packs/day, stacked" right={tf === '24H' ? '30D BACKDROP' : tf} />
      <VelocityChart />

      <SectionHead tag="02 · TIERS" title="Edge by tier" right="ALL-TIME" />
      <TierStrip />

      <SectionHead tag="03 · LIVE" title="Recent pulls" right={<button onClick={onOpenLive} style={{ all: 'unset', cursor: 'pointer', color: P.amber }}>OPEN STREAM →</button>} />
      <LiveTickerStrip />

      <SectionHead tag="04 · BIG HITS" title="Top hits · 7d" right="FMV" />
      <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
        <HitRow hot title="Shining Celebi 1ed #106" set="Neo Destiny · 2002" who="@phantasmagore" tier="Ultra" fmv="9,900" />
        <HitRow hot title="Charizard Base Set Holo" set="Base Set · 1999" who="0x8a…42de" tier="Ultra" fmv="6,150" />
        <HitRow title="Lugia Neo Genesis 1ed" set="Neo Genesis · 2000" who="@yumi" tier="Premium" fmv="3,420" />
        <HitRow title="Mewtwo Jungle Holo" set="Jungle · 1999" who="@kage" tier="Premium" fmv="2,180" />
        <HitRow title="Gengar Fossil 1ed" set="Fossil · 1999" who="@aether" tier="Premium" fmv="1,640" />
      </div>

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 24 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † <span style={{ color: P.fg3 }}>MnStr FMV</span> is the value the vault assigns each card.<br/>
          † Cards are physical, not NFTs. Chain stores a payment receipt only.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TIERS
// ─────────────────────────────────────────────────────────────

function TierPicker({ value, onChange }) {
  const tiers = [
    { id: 'Starter', sub: '$50' },
    { id: 'Premium', sub: '$250' },
    { id: 'Ultra',   sub: '$1,250' },
  ];
  return (
    <div style={{
      margin: '12px 12px 0',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 0, border: `1px solid ${P.lineSoft}`,
    }}>
      {tiers.map((t, i) => {
        const on = t.id === value;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center',
            padding: '12px 6px',
            background: on ? P.bg3 : P.bg2,
            borderRight: i === 2 ? 'none' : `1px solid ${P.lineSoft}`,
            position: 'relative',
          }}>
            {on && <span style={{
              position: 'absolute', top: -1, left: 0, right: 0, height: 2,
              background: P.amber, boxShadow: `0 0 10px ${P.amber}`,
            }}/>}
            <Mono style={{ fontSize: 9, letterSpacing: '0.14em', color: on ? P.amber : P.fg3, textTransform: 'uppercase' }}>{t.id}</Mono>
            <Mono style={{ fontSize: 14, color: P.fg, display: 'block', marginTop: 3 }}>{t.sub}</Mono>
          </button>
        );
      })}
    </div>
  );
}

function ViolinChart() {
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
      <div style={{ padding: '10px 12px 4px', display: 'flex', alignItems: 'baseline' }}>
        <Lbl>FMV distribution · log $</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 9, color: P.fg4 }}>n = 9,873</Mono>
      </div>
      <svg viewBox="0 0 360 160" style={{ width: '100%', height: 160, display: 'block' }}>
        {/* price line */}
        <line x1="148" y1="14" x2="148" y2="140" stroke={P.mag} strokeDasharray="3 3"/>
        <text x="152" y="22" fontFamily={P.mono} fontSize="9" fill={P.mag}>price · $250</text>
        {/* violin */}
        <defs>
          <linearGradient id="vio" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={P.amber} stopOpacity="0.5"/>
            <stop offset="1" stopColor={P.amber} stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        <path d="M16,82
                 C 50,80 90,76 130,73
                 C 170,70 210,66 250,63
                 C 290,61 320,60 348,60
                 L 348,90
                 C 320,90 290,89 250,87
                 C 210,84 170,80 130,77
                 C 90,74 50,72 16,72 Z"
              fill="url(#vio)" stroke={P.amber} strokeWidth="0.9"/>
        {/* strip dots */}
        <g fill={P.fg} opacity="0.5">
          {[30,46,62,78,98,118,142,166,192,218,244,272,300].map((x, i) => (
            <circle key={i} cx={x} cy={76 + (i % 3) - 1} r="1.3"/>
          ))}
        </g>
        {/* outlier */}
        <circle cx="338" cy="30" r="3" fill={P.amber}/>
        <text x="296" y="26" fontFamily={P.mono} fontSize="8.5" fill={P.amber}>$3,420 · Lugia</text>
        {/* median */}
        <line x1="118" y1="66" x2="118" y2="98" stroke={P.fg} strokeWidth="1.2"/>
        <text x="122" y="108" fontFamily={P.mono} fontSize="9" fill={P.fg2}>median · $206</text>
        {/* axis */}
        <g fontFamily={P.mono} fontSize="8.5" fill={P.fg4}>
          <text x="4"   y="154">$10</text>
          <text x="80"  y="154">$100</text>
          <text x="170" y="154">$500</text>
          <text x="240" y="154">$1k</text>
          <text x="320" y="154">$10k</text>
        </g>
      </svg>
    </div>
  );
}

function EconGrid({ items }) {
  return (
    <div style={{
      margin: '0 12px',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 0, border: `1px solid ${P.lineSoft}`,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '10px 12px',
          borderRight: i % 2 === 0 ? `1px solid ${P.lineSoft}` : 'none',
          borderTop: i >= 2 ? `1px solid ${P.lineSoft}` : 'none',
          background: P.bg2,
        }}>
          <Lbl style={{ fontSize: 8.5 }}>{it.l}</Lbl>
          <Mono style={{ fontSize: 15, color: it.tone === 'pos' ? P.mint : it.tone === 'neg' ? P.mag : P.fg, marginTop: 4, display: 'block' }}>{it.v}</Mono>
        </div>
      ))}
    </div>
  );
}

function TiersScreen({ onOpenCard }) {
  const [tier, setTier] = React.useState('Premium');
  const [mode, setMode] = React.useState('realised');
  const D = {
    Starter: {
      edge: { realised: '15.8%', paper: '11.2%' },
      ev:   { realised: '$42.10', paper: '$44.40' },
      pnl:  { realised: '+$211.4k', paper: '+$158.2k' },
      sold: '64.1%', hit: '18.2%',
      paid: '$1.42M', fmv: '$1.20M', expo: '−$298k',
      median: '$38', p25: '$22 — $58',
    },
    Premium: {
      edge: { realised: '17.4%', paper: '12.8%' },
      ev:   { realised: '$206.40', paper: '$218.10' },
      pnl:  { realised: '+$429.6k', paper: '+$316.4k' },
      sold: '61.2%', hit: '23.4%',
      paid: '$2.47M', fmv: '$2.04M', expo: '−$612.1k',
      median: '$206', p25: '$98 — $312',
    },
    Ultra: {
      edge: { realised: '10.6%', paper: '6.4%' },
      ev:   { realised: '$1,118', paper: '$1,170' },
      pnl:  { realised: '+$248.3k', paper: '+$147.2k' },
      sold: '52.8%', hit: '34.7%',
      paid: '$2.30M', fmv: '$2.05M', expo: '−$510k',
      median: '$1,080', p25: '$640 — $1,580',
    },
  }[tier];
  const price = tier === 'Starter' ? '50' : tier === 'Premium' ? '250' : '1,250';

  return (
    <>
      <TierPicker value={tier} onChange={setTier} />
      <RealisedPaperToggle value={mode} onChange={setMode} />

      <div style={{ margin: '12px 12px 0', padding: '14px 14px 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
        <Lbl style={{ fontSize: 8.5 }}>House edge · {mode}</Lbl>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
          <Mono style={{ fontSize: 36, color: P.amber, letterSpacing: '-0.02em' }}>{D.edge[mode]}</Mono>
          <div style={{ textAlign: 'right' }}>
            <Mono style={{ fontSize: 11, color: P.fg2, display: 'block' }}>EV {D.ev[mode]}</Mono>
            <Mono style={{ fontSize: 10, color: P.fg3 }}>vs ${price}</Mono>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 6, background: P.bg3, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, width: `${parseFloat(D.edge[mode]) / 30 * 100}%`,
            background: `linear-gradient(90deg, ${P.amber}, oklch(0.6 0.16 60))`,
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <Mono style={{ fontSize: 8.5, color: P.fg4 }}>0%</Mono>
          <Mono style={{ fontSize: 8.5, color: P.fg4 }}>30%</Mono>
        </div>
      </div>

      <SectionHead tag="01 · DIST" title="Pulled FMV distribution" right="LOG SCALE" />
      <ViolinChart />

      <SectionHead tag="02 · TREND" title="Sold-back rate over time" right="12 MO" />
      <SoldBackChart tier={tier} />

      <SectionHead tag="03 · BOOK" title="Pack economics" />
      <EconGrid items={[
        { l: 'Cycled in', v: D.paid },
        { l: 'Vault FMV out', v: D.fmv },
        { l: `${mode === 'realised' ? 'Realised' : 'Paper'} P&L`, v: D.pnl[mode], tone: 'pos' },
        { l: 'Unrealised exposure', v: D.expo, tone: 'neg' },
        { l: 'Median FMV', v: D.median },
        { l: 'P25 — P75', v: D.p25 },
        { l: 'Sold-back rate', v: D.sold },
        { l: 'Hit > price', v: D.hit, tone: 'pos' },
      ]} />

      <SectionHead tag="04 · OUTLIERS" title="Biggest pulls · this tier" right="ALL-TIME" />
      <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
        {tier === 'Ultra' ? (
          <>
            <HitRow hot title="Shining Celebi 1ed #106" set="Neo Destiny · 2002" who="@phantasmagore" tier="Ultra" fmv="9,900" />
            <HitRow hot title="Charizard Base Set Holo" set="Base Set · 1999" who="0x8a…42de" tier="Ultra" fmv="6,150" />
            <HitRow title="Blastoise Base 1ed" set="Base Set · 1999" who="@solo" tier="Ultra" fmv="4,820" />
          </>
        ) : tier === 'Premium' ? (
          <>
            <HitRow hot title="Lugia Neo Genesis 1ed" set="Neo Genesis · 2000" who="@yumi" tier="Premium" fmv="3,420" />
            <HitRow title="Mewtwo Jungle Holo" set="Jungle · 1999" who="@kage" tier="Premium" fmv="2,180" />
            <HitRow title="Gengar Fossil 1ed" set="Fossil · 1999" who="@aether" tier="Premium" fmv="1,640" />
          </>
        ) : (
          <>
            <HitRow title="Sprigatito McD #017 PSA10" set="JPN M-P Promo · 2025" who="@kage" tier="Starter" fmv="384" />
            <HitRow title="Pikachu Promo #058" set="Black Star · 2020" who="@yumi" tier="Starter" fmv="218" />
            <HitRow title="Eevee Evolutions" set="JPN VMAX Climax" who="0x7c…91a4" tier="Starter" fmv="142" />
          </>
        )}
      </div>

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 24 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † Distribution uses <span style={{ color: P.fg3 }}>MnStr FMV</span> at time of pull.<br/>
          † Realized = cycled in − payouts on sold-back. Unrealized = vault FMV of holding pulls.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WALLETS
// ─────────────────────────────────────────────────────────────

function SortBar({ value, onChange }) {
  const opts = ['Net P&L', 'Spend', 'Pulls'];
  return (
    <div style={{
      margin: '12px 12px 0',
      display: 'flex', border: `1px solid ${P.lineSoft}`,
      background: P.bg2,
    }}>
      {opts.map((o, i) => {
        const on = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
            padding: '9px 0',
            background: on ? P.bg3 : 'transparent',
            borderRight: i === opts.length - 1 ? 'none' : `1px solid ${P.lineSoft}`,
            position: 'relative',
          }}>
            <Mono style={{ fontSize: 10, letterSpacing: '0.1em', color: on ? P.amber : P.fg3, textTransform: 'uppercase' }}>{o}</Mono>
            {on && <span style={{
              position: 'absolute', top: -1, left: 0, right: 0, height: 2, background: P.amber,
            }}/>}
          </button>
        );
      })}
    </div>
  );
}

function PnlLadder() {
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
      <div style={{ padding: '10px 12px 4px' }}>
        <Lbl>Net P&L · top 24 wallets</Lbl>
      </div>
      <svg viewBox="0 0 360 120" style={{ width: '100%', height: 120, display: 'block' }}>
        <line x1="0" y1="60" x2="360" y2="60" stroke={P.line}/>
        {Array.from({ length: 12 }).map((_, i) => {
          const h = 50 - i * 4;
          return <rect key={'p'+i} x={6 + i * 14} y={60 - h} width={11} height={h} fill={P.mint} opacity={0.85 - i * 0.04}/>;
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const h = 8 + i * 6;
          return <rect key={'n'+i} x={180 + i * 14} y={60} width={11} height={h} fill={P.mag} opacity={0.6 + i * 0.03}/>;
        })}
        <text x="6" y="14" fontFamily={P.mono} fontSize="9" fill={P.mint}>+$48,210 ▴</text>
        <text x="270" y="116" fontFamily={P.mono} fontSize="9" fill={P.mag} textAnchor="end">▾ −$36,400</text>
      </svg>
    </div>
  );
}

function LbRow({ rank, handle, addr, pulls, spend, pnl, pos, spark, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
      padding: '10px 12px',
      borderTop: rank === 1 ? 'none' : `1px dashed ${P.lineSoft}`,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '22px 26px 1fr auto',
        gap: 10, alignItems: 'center',
      }}>
        <Mono style={{ fontSize: 11, color: P.fg4 }}>{String(rank).padStart(2, '0')}</Mono>
        <Identicon addr={addr.replace(/[…]/g, 'f') + '00'} size={26}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: P.sans, fontSize: 13, color: P.fg, fontWeight: 500 }}>{handle || addr}</span>
            {handle && <Mono style={{ fontSize: 9.5, color: P.fg4 }}>{addr}</Mono>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
            <Mono style={{ fontSize: 9.5, color: P.fg3 }}>{pulls} pulls</Mono>
            <Mono style={{ fontSize: 9.5, color: P.fg3 }}>· {spend} spent</Mono>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Mono style={{ fontSize: 13, color: pos ? P.mint : P.mag, display: 'block' }}>{pos ? '+' : ''}${pnl}</Mono>
          <div style={{ marginTop: 3 }}>
            <Sparkline pts={spark} color={pos ? P.mint : P.mag} w={60} h={14}/>
          </div>
        </div>
      </div>
    </button>
  );
}

function WalletsScreen({ onOpenWallet }) {
  const [sort, setSort] = React.useState('Net P&L');
  const [q, setQ] = React.useState('');
  const [shown, setShown] = React.useState(8);

  const allRows = [
    { rank: 1,  handle: 'phantasmagore', addr: '0xa1…02f3', pulls: '218', spend: '$104.5k', pnl: '48,210', pos: true,  spark: [2,3,3,4,4,5,5,6,7,8,10,12] },
    { rank: 2,  handle: 'kage',          addr: '0x3c…150e', pulls: '412', spend: '$78.2k',  pnl: '18,200', pos: true,  spark: [3,3,4,4,5,5,6,6,7,8,9,10] },
    { rank: 3,  handle: 'yumi',          addr: '0x8a…42de', pulls: '98',  spend: '$42.0k',  pnl: '9,100',  pos: true,  spark: [2,3,3,4,4,5,6,6,7,7,8,9] },
    { rank: 4,  handle: null,            addr: '0x7c…91a4', pulls: '684', spend: '$34.2k',  pnl: '12,100', pos: false, spark: [10,9,8,7,7,6,5,5,4,3,2,2] },
    { rank: 5,  handle: 'aether',        addr: '0x9e…04bd', pulls: '52',  spend: '$28.7k',  pnl: '16,300', pos: false, spark: [9,8,7,7,6,5,5,4,4,3,2,2] },
    { rank: 6,  handle: 'solo',          addr: '0xbb…aa10', pulls: '31',  spend: '$15.1k',  pnl: '10,900', pos: false, spark: [8,7,6,5,5,4,4,3,3,2,2,1] },
    { rank: 7,  handle: 'nightside',     addr: '0x12…99ee', pulls: '146', spend: '$22.4k',  pnl: '6,420',  pos: true,  spark: [3,3,4,4,5,5,5,6,6,7,7,8] },
    { rank: 8,  handle: null,            addr: '0x55…0a44', pulls: '208', spend: '$10.4k',  pnl: '3,180',  pos: false, spark: [5,5,5,4,4,4,3,3,3,2,2,2] },
    { rank: 9,  handle: 'glimmer',       addr: '0x21…77bc', pulls: '64',  spend: '$18.2k',  pnl: '4,120',  pos: true,  spark: [2,2,3,3,4,4,5,5,5,6,6,7] },
    { rank: 10, handle: 'cobalt',        addr: '0xee…42af', pulls: '128', spend: '$16.8k',  pnl: '5,200',  pos: false, spark: [6,5,5,4,4,3,3,3,2,2,2,2] },
    { rank: 11, handle: null,            addr: '0x09…3311', pulls: '92',  spend: '$11.6k',  pnl: '2,890',  pos: false, spark: [5,4,4,4,3,3,3,3,2,2,2,2] },
    { rank: 12, handle: 'mira',          addr: '0xbe…0a01', pulls: '47',  spend: '$9.1k',   pnl: '1,640',  pos: true,  spark: [2,2,2,3,3,3,4,4,4,5,5,5] },
  ];
  const ql = q.trim().toLowerCase();
  const filtered = !ql ? allRows : allRows.filter(r => (r.handle || '').toLowerCase().includes(ql) || r.addr.toLowerCase().includes(ql));
  const visible = filtered.slice(0, shown);
  const remaining = Math.max(0, 1238 - shown);

  return (
    <>
      <SortBar value={sort} onChange={setSort} />
      <WalletSearchBar value={q} onChange={(v) => { setQ(v); setShown(8); }} count={filtered.length === allRows.length ? 1238 : filtered.length}/>

      <div style={{ margin: '12px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <KpiTile label="Wallets" value="1,238" delta="+18 · 24h"/>
        <KpiTile label="Top 1% spend" value="42%"/>
        <KpiTile label="Winners" value="38%"/>
      </div>

      <SectionHead tag="01 · LADDER" title="Realised P&L distribution" right="TOP 24" />
      <PnlLadder />

      <SectionHead tag="02 · TABLE" title={`Sorted by ${sort.toLowerCase()}`} right={`${filtered.length === allRows.length ? '1,238' : filtered.length} WALLETS`} />
      {filtered.length === 0 ? <EmptyState title="NO WALLETS" sub="No handle or address matched."/> : (
        <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
          {visible.map((r) => <LbRow key={r.rank} {...r} onClick={onOpenWallet}/>)}
        </div>
      )}

      {filtered.length === allRows.length && <LoadMore remaining={remaining} onLoad={() => setShown(s => s + 8)}/>}

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 16 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † Net P&L = spend − sold-back payouts − holding FMV. Revalues on every poll.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WALLET DETAIL
// ─────────────────────────────────────────────────────────────

function WalletDetailScreen({ onBack }) {
  return (
    <>
      <div style={{ padding: '12px 16px 0' }}>
        <button onClick={onBack} style={{
          all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18 L9 12 L15 6" stroke={P.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <Mono style={{ fontSize: 10, color: P.amber, letterSpacing: '0.14em' }}>BACK · WALLETS</Mono>
        </button>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Identicon addr="0xa1b2c3a8aaee02f3" size={44}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: P.sans, fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>phantasmagore</div>
            <Mono style={{ fontSize: 10.5, color: P.fg3 }}>0xa1b2c3…02f3 · rank #1</Mono>
          </div>
          <button style={{
            all: 'unset', cursor: 'pointer',
            padding: '5px 10px', border: `1px solid ${P.line}`, background: P.bg2,
            fontFamily: P.mono, fontSize: 9.5, color: P.fg3, letterSpacing: '0.12em',
          }}>SHARE</button>
        </div>
      </div>

      <div style={{ margin: '14px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <KpiTile label="Pulls · all" value="218"/>
        <KpiTile label="Spend" value="$104.5" unit="k"/>
        <KpiTile label="Payouts" value="$152.7" unit="k"/>
      </div>

      <div style={{ margin: '8px 12px 0', background: P.bg2, border: `1px solid ${P.lineSoft}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Lbl>Net P&L · realized</Lbl>
          <Mono style={{ fontSize: 9, color: P.mint }}>● up 14d</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <Mono style={{ fontSize: 28, color: P.mint, letterSpacing: '-0.01em' }}>+$48,210</Mono>
          <Sparkline pts={[1,2,3,3,4,4,5,5,6,7,8,9,10,12]} w={70} h={22}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <div><Lbl style={{ fontSize: 8.5 }}>Held FMV</Lbl><Mono style={{ fontSize: 13, color: P.fg, marginTop: 3 }}>$22,400</Mono></div>
          <div><Lbl style={{ fontSize: 8.5 }}>Sold-back</Lbl><Mono style={{ fontSize: 13, color: P.fg, marginTop: 3 }}>$130.3k</Mono></div>
          <div><Lbl style={{ fontSize: 8.5 }}>Big hits</Lbl><Mono style={{ fontSize: 13, color: P.amber, marginTop: 3 }}>4</Mono></div>
        </div>
      </div>

      <SectionHead tag="01 · TIER MIX" title="Where they spent" />
      <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', height: 8, gap: 1 }}>
          <div style={{ width: '18%', background: P.blue }}/>
          <div style={{ width: '38%', background: P.amber }}/>
          <div style={{ width: '44%', background: P.mag }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          <div><Mono style={{ fontSize: 9, color: P.blue }}>● STARTER</Mono><Mono style={{ fontSize: 11, color: P.fg, display: 'block', marginTop: 2 }}>42 pulls</Mono></div>
          <div><Mono style={{ fontSize: 9, color: P.amber }}>● PREMIUM</Mono><Mono style={{ fontSize: 11, color: P.fg, display: 'block', marginTop: 2 }}>108 pulls</Mono></div>
          <div><Mono style={{ fontSize: 9, color: P.mag }}>● ULTRA</Mono><Mono style={{ fontSize: 11, color: P.fg, display: 'block', marginTop: 2 }}>68 pulls</Mono></div>
        </div>
      </div>

      <SectionHead tag="02 · COLLECTION" title="Cards pulled" right="218 TOTAL" />
      <div style={{
        margin: '0 12px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
      }}>
        <CardSlot hot fmv="9,900" psa="PSA 10" captionTier="Ultra" />
        <CardSlot hot fmv="6,150" psa="PSA 10" captionTier="Ultra" />
        <CardSlot fmv="3,420" psa="PSA 10" captionTier="Premium" />
        <CardSlot fmv="1,890" psa="PSA 10" captionTier="Ultra" chase />
        <CardSlot fmv="1,540" psa="PSA 10" captionTier="Ultra" />
        <CardSlot fmv="1,210" psa="PSA 9" captionTier="Premium" />
        <CardSlot fmv="840" psa="PSA 10" captionTier="Premium" />
        <CardSlot fmv="612" psa="PSA 10" captionTier="Premium" />
        <CardSlot fmv="312" psa="PSA 10" captionTier="Premium" />
      </div>
      <div style={{ padding: '12px 16px', textAlign: 'center' }}>
        <Mono style={{ fontSize: 10, color: P.fg3, letterSpacing: '0.14em' }}>+ 209 MORE</Mono>
      </div>

      <SectionHead tag="03 · RHYTHM" title="Pulls over time" right="12 WK" />
      <WalletPullsTimeline/>

      <SectionHead tag="04 · NEIGHBOURS" title="Wallets near rank" right="±3" />
      <WalletNeighbours onOpenWallet={() => {}}/>

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 8 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † Wallet ↔ username comes from MnStr profile. Public, voluntary.<br/>
          † Net P&L revalues on every poll as held cards re-price.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CARDS (THE WALL)
// ─────────────────────────────────────────────────────────────

function FilterChips({ chips, value, onChange }) {
  return (
    <div style={{
      margin: '12px 12px 0',
      display: 'flex', gap: 6, overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {chips.map(c => {
        const on = c === value;
        return (
          <button key={c} onClick={() => onChange(c)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '6px 10px',
            background: on ? P.amber + '14' : P.bg2,
            border: `1px solid ${on ? P.amber + '55' : P.lineSoft}`,
            fontFamily: P.mono, fontSize: 10, letterSpacing: '0.1em',
            color: on ? P.amber : P.fg3, textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>{c}</button>
        );
      })}
    </div>
  );
}

function CardsScreen({ onOpenCard }) {
  const [view, setView] = React.useState('Top hits');
  const [tier, setTier] = React.useState('All tiers');
  const [q, setQ] = React.useState('');
  const [shown, setShown] = React.useState(12);

  const cards = [
    { fmv: '9,900', psa: 'PSA 10', tier: 'Ultra',   hot: true,  title: 'Shining Celebi 1ed #106',     set: 'Neo Destiny' },
    { fmv: '6,150', psa: 'PSA 10', tier: 'Ultra',   hot: true,  title: 'Charizard Base Set Holo',     set: 'Base Set' },
    { fmv: '3,420', psa: 'PSA 10', tier: 'Premium',             title: 'Lugia Neo Genesis 1ed',       set: 'Neo Genesis' },
    { fmv: '2,180', psa: 'PSA 9',  tier: 'Premium',             title: 'Mewtwo Jungle Holo',          set: 'Jungle' },
    { fmv: '1,890', psa: 'PSA 10', tier: 'Ultra',   chase: true, title: 'Blastoise Base 1ed',         set: 'Base Set' },
    { fmv: '1,540', psa: 'PSA 10', tier: 'Ultra',               title: 'Gengar Fossil 1ed',           set: 'Fossil' },
    { fmv: '1,310', psa: 'PSA 9',  tier: 'Premium',             title: 'Venusaur Base Holo',          set: 'Base Set' },
    { fmv: '1,210', psa: 'PSA 10', tier: 'Premium',             title: 'Alakazam Base 1ed',           set: 'Base Set' },
    { fmv: '1,080', psa: 'PSA 10', tier: 'Ultra',   chase: true, title: 'Raichu Base 1ed',            set: 'Base Set' },
    { fmv: '960',   psa: 'PSA 9',  tier: 'Premium',             title: 'Machamp Base Holo',           set: 'Base Set' },
    { fmv: '880',   psa: 'PSA 10', tier: 'Premium',             title: 'Nidoking Base 1ed',           set: 'Base Set' },
    { fmv: '840',   psa: 'PSA 10', tier: 'Premium',             title: 'Ninetales Base 1ed',          set: 'Base Set' },
    { fmv: '720',   psa: 'PSA 10', tier: 'Premium',             title: 'Hitmonchan Base 1ed',         set: 'Base Set' },
    { fmv: '640',   psa: 'PSA 10', tier: 'Premium',             title: 'Magneton Base 1ed',           set: 'Base Set' },
    { fmv: '384',   psa: 'PSA 10', tier: 'Starter',             title: 'Sprigatito McD #017',         set: 'JPN M-P Promo' },
    { fmv: '218',   psa: 'PSA 10', tier: 'Starter',             title: 'Pikachu Promo #058',          set: 'Black Star' },
  ];

  const tierMatch = (c) => tier === 'All tiers' || c.tier === tier;
  const qMatch = (c) => {
    const ql = q.trim().toLowerCase();
    if (!ql) return true;
    return (c.title || '').toLowerCase().includes(ql) || (c.set || '').toLowerCase().includes(ql);
  };
  const viewMatch = (c) => {
    if (view === 'Chase pool') return c.chase;
    return true;
  };
  const filtered = cards.filter(c => tierMatch(c) && qMatch(c) && viewMatch(c));
  const visible = filtered.slice(0, shown);
  const remaining = Math.max(0, 2184 - shown);

  return (
    <>
      <FilterChips chips={['Top hits', 'Most pulled', 'Chase pool', 'Recent']} value={view} onChange={(v) => { setView(v); setShown(12); }} />
      <FilterChips chips={['All tiers', 'Starter', 'Premium', 'Ultra']} value={tier} onChange={(v) => { setTier(v); setShown(12); }} />
      <CardSearchBar value={q} onChange={(v) => { setQ(v); setShown(12); }} count={filtered.length}/>

      <div style={{ margin: '12px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <KpiTile label="Cards in vault" value="2,184"/>
        <KpiTile label="Chase left" value="14 / 42"/>
      </div>

      <SectionHead tag="01 · THE WALL" title={view + (tier !== 'All tiers' ? ` · ${tier}` : '')} right="TAP TO OPEN" />
      {filtered.length === 0 ? <EmptyState title="NO CARDS" sub="Try a different search or filter."/> : (
        <div style={{ padding: '0 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {visible.map((c, i) => (
            <button key={i} onClick={onOpenCard} style={{ all: 'unset', cursor: 'pointer' }}>
              <CardSlot {...c} captionTier={c.tier}/>
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && q.trim() === '' && <LoadMore remaining={remaining} onLoad={() => setShown(s => s + 8)}/>}

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 16 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † Cards are physical PSA-graded slabs, not NFTs. Held by MnStr's insured vault.<br/>
          † Chase pool tracks cards MnStr publicly seeds; we don't know per-pack odds.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD DETAIL
// ─────────────────────────────────────────────────────────────

function CardDetailScreen({ onBack }) {
  return (
    <>
      <div style={{ padding: '12px 16px 0' }}>
        <button onClick={onBack} style={{
          all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18 L9 12 L15 6" stroke={P.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <Mono style={{ fontSize: 10, color: P.amber, letterSpacing: '0.14em' }}>BACK · CARDS</Mono>
        </button>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <Lbl>NEO DESTINY · 2002 · PSA 10</Lbl>
        <div style={{ fontFamily: P.sans, fontSize: 22, color: P.fg, letterSpacing: '-0.01em', marginTop: 6, lineHeight: 1.2 }}>
          Shining Celebi 1st Edition #106
        </div>
        <Mono style={{ fontSize: 10.5, color: P.fg3, marginTop: 4, display: 'block' }}>cert · 6392-8940 · slug bnded-celebi-106</Mono>
      </div>

      <div style={{ margin: '14px 16px 0', position: 'relative' }}>
        <div style={{
          aspectRatio: '5/7',
          background: `
            radial-gradient(circle at 30% 25%, oklch(0.42 0.06 85 / 0.4), transparent 50%),
            repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 6px, oklch(0.22 0.01 70) 6px, oklch(0.22 0.01 70) 12px)
          `,
          border: `1px solid ${P.amber}88`,
          boxShadow: `0 0 0 1px ${P.amber}22, 0 16px 60px ${P.amber}1f`,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between' }}>
            <Mono style={{ fontSize: 12, color: P.amber, letterSpacing: '0.16em' }}>PSA 10</Mono>
            <Mono style={{ fontSize: 11, color: P.fg3, letterSpacing: '0.1em' }}>SHINING CELEBI</Mono>
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <Mono style={{ fontSize: 9, color: P.fg4, letterSpacing: '0.1em' }}>FMV at last pull</Mono>
              <Mono style={{ fontSize: 22, color: P.fg, display: 'block', marginTop: 2 }}>$9,900</Mono>
            </div>
            <Mono style={{ fontSize: 9, color: P.fg4, letterSpacing: '0.12em' }}>1ed · #106</Mono>
          </div>
        </div>
      </div>

      <div style={{ margin: '14px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <KpiTile label="Times pulled" value="1"/>
        <KpiTile label="In vault" value="No" delta="sold-back"/>
        <KpiTile label="MnStr FMV" value="$9,900"/>
      </div>

      <SectionHead tag="01 · HISTORY" title="Pull history" right="1 PULL" />
      <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontFamily: P.sans, fontSize: 13, color: P.fg }}>phantasmagore</div>
            <Mono style={{ fontSize: 10, color: P.fg3, marginTop: 3, display: 'block' }}>0xa1…02f3 · 03 Apr 2026 · 14:21 UTC</Mono>
          </div>
          <div style={{ textAlign: 'right' }}>
            <TierTag tier="Ultra"/>
            <Mono style={{ fontSize: 9, color: P.fg3, display: 'block', marginTop: 4 }}>paid $1,250</Mono>
          </div>
        </div>
        <div style={{
          marginTop: 12, padding: '8px 10px',
          background: P.bg3,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <Mono style={{ fontSize: 9, color: P.mag, letterSpacing: '0.1em' }}>SOLD-BACK</Mono>
            <Mono style={{ fontSize: 11, color: P.fg, display: 'block', marginTop: 2 }}>$8,415 payout</Mono>
          </div>
          <Mono style={{ fontSize: 11, color: P.mint }}>+$7,165 net</Mono>
        </div>
      </div>

      <SectionHead tag="02 · COMPS" title="Set comparables" right="MNSTR FMV" />
      <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
        {[
          { n: 'Shining Charizard 1ed', g: 'PSA 10', f: '$14,800', p: '0 pulled' },
          { n: 'Shining Gyarados 1ed',  g: 'PSA 10', f: '$3,250',  p: '2 pulled' },
          { n: 'Shining Steelix 1ed',   g: 'PSA 10', f: '$1,640',  p: '1 pulled' },
          { n: 'Shining Raichu 1ed',    g: 'PSA 10', f: '$2,950',  p: '0 pulled' },
        ].map((r, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            borderTop: i === 0 ? 'none' : `1px dashed ${P.lineSoft}`,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: P.sans, fontSize: 12, color: P.fg }}>{r.n}</div>
              <Mono style={{ fontSize: 9, color: P.fg3, marginTop: 2, display: 'block' }}>{r.g} · {r.p}</Mono>
            </div>
            <Mono style={{ fontSize: 12, color: P.amber }}>{r.f}</Mono>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 24 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † Comps reflect <span style={{ color: P.fg3 }}>MnStr FMV</span> at last sighting; not market consensus.<br/>
          † Card is no longer in MnStr's vault. Last status: sold-back to player.
        </Mono>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// LIVE
// ─────────────────────────────────────────────────────────────

function LiveScreen() {
  const [tick, setTick] = React.useState(0);
  const [embedOpen, setEmbedOpen] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, []);
  const flash = tick % 6 === 0;

  return (
    <>
      <div style={{
        margin: '12px 12px 0', padding: '14px 14px',
        background: P.bg2, border: `1px solid ${P.lineSoft}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ position: 'relative', width: 14, height: 14 }}>
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%', background: P.mint,
            boxShadow: `0 0 10px ${P.mint}`,
          }}/>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${P.mint}`, opacity: 0.5,
            animation: 'mnstr-pulse 1.6s ease-out infinite',
          }}/>
        </div>
        <div style={{ flex: 1 }}>
          <Mono style={{ fontSize: 11, color: P.mint, letterSpacing: '0.18em' }}>● STREAM LIVE</Mono>
          <Mono style={{ fontSize: 9, color: P.fg3, marginTop: 2, display: 'block' }}>polling every 5s · 18:42:{17 + (tick % 40)} UTC</Mono>
        </div>
        <button onClick={() => setEmbedOpen(true)} style={{
          all: 'unset', cursor: 'pointer',
          padding: '5px 9px', border: `1px solid ${P.amber}55`, background: P.amber + '10',
          fontFamily: P.mono, fontSize: 10, color: P.amber, letterSpacing: '0.12em',
        }}>?EMBED=1</button>
      </div>

      <SectionHead tag="01 · WINDOW · 1H" title="Right now" />
      <div style={{ margin: '0 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        <KpiTile label="Packs" value="38" delta="+3"/>
        <KpiTile label="USDm" value="$14.8" unit="k"/>
        <KpiTile label="Paid out" value="$8.9" unit="k"/>
        <KpiTile label="Big hits" value="2" delta="amber"/>
      </div>

      <SectionHead tag="02 · STREAM" title="Latest pulls" right="NEWEST FIRST" />

      <div style={{ padding: '0 12px' }}>
        <div style={{
          position: 'relative',
          background: P.bg2, border: `1px solid ${flash ? P.amber : P.lineSoft}`,
          boxShadow: flash ? `0 0 0 1px ${P.amber}55, 0 0 24px ${P.amber}3a` : 'none',
          transition: 'box-shadow 200ms, border-color 200ms',
          display: 'grid', gridTemplateColumns: '110px 1fr',
          gap: 12, padding: 10,
        }}>
          <CardSlot hot fmv="8,415" psa="PSA 10"/>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Mono style={{ fontSize: 9, color: P.amber, letterSpacing: '0.16em' }}>● NOW · {tick % 20}s AGO</Mono>
              <div style={{ fontFamily: P.sans, fontSize: 14, color: P.fg, marginTop: 6, lineHeight: 1.25 }}>Shining Celebi 1ed #106</div>
              <Mono style={{ fontSize: 9.5, color: P.fg3, marginTop: 4, display: 'block' }}>Neo Destiny · 2002</Mono>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Mono style={{ fontSize: 11, color: P.fg }}>@phantasmagore</Mono>
                <TierTag tier="Ultra"/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                <StatusPill status="sold_back"/>
                <Mono style={{ fontSize: 14, color: P.amber }}>+$8,415</Mono>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: '12px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { fmv: '312', who: '@kage',          tier: 'Premium', psa: 'PSA 10', status: 'holding',   ago: '42s' },
          { fmv: '35',  who: '0x7c…91a4',     tier: 'Starter', psa: 'PSA 9',  status: 'holding',   ago: '1m' },
          { fmv: '29',  who: '@yumi',          tier: 'Starter', psa: 'PSA 10', status: 'sold_back', ago: '2m' },
          { fmv: '212', who: '@aether',        tier: 'Premium', psa: 'PSA 10', status: 'sold_back', ago: '3m' },
          { fmv: '42',  who: '0xbb…aa10',     tier: 'Starter', psa: 'PSA 9',  status: 'sold_back', ago: '4m' },
          { fmv: '184', who: '@solo',          tier: 'Premium', psa: 'PSA 10', status: 'holding',   ago: '6m' },
        ].map((it, i) => (
          <div key={i} style={{
            background: P.bg2, border: `1px solid ${P.lineSoft}`,
            padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <CardSlot fmv={it.fmv} psa={it.psa}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Mono style={{ fontSize: 10, color: P.fg }}>{it.who}</Mono>
              <Mono style={{ fontSize: 8.5, color: P.fg4 }}>{it.ago}</Mono>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TierTag tier={it.tier} style={{ padding: '1px 4px', fontSize: 7.5 }}/>
              <StatusPill status={it.status}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 16px 24px', borderTop: `1px dashed ${P.lineSoft}`, marginTop: 24 }}>
        <Mono style={{ fontSize: 9.5, color: P.fg4, lineHeight: 1.7 }}>
          † <button onClick={() => setEmbedOpen(true)} style={{ all: 'unset', cursor: 'pointer', color: P.amber }}>?embed=1</button> hides chrome for streamers.<br/>
          † Big hits (≥$1k FMV) flash &amp; pin for 30s.
        </Mono>
      </div>

      <LiveEmbedPreview open={embedOpen} onClose={() => setEmbedOpen(false)}/>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// App — owns the active screen + handles drill-down navigation
// ─────────────────────────────────────────────────────────────

function AppScreen({ start = 'pulse' }) {
  const [route, setRoute] = React.useState(start);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [caveatOpen, setCaveatOpen] = React.useState(false);
  // routes: pulse | tiers | wallets | wallet | cards | card | live

  const TITLES = {
    pulse:   { title: 'PULSE',   sub: 'GLOBAL · 24H VIEW' },
    tiers:   { title: 'TIERS',   sub: 'PACK ECONOMICS' },
    wallets: { title: 'WALLETS', sub: '1,238 WALLETS' },
    wallet:  { title: 'WALLET',  sub: 'PHANTASMAGORE · #1' },
    cards:   { title: 'CARDS',   sub: '2,184 IN VAULT' },
    card:    { title: 'CARD',    sub: 'NEO DESTINY · 2002' },
    live:    { title: 'LIVE',    sub: '● STREAMING · 5S POLL' },
  };
  const activeTab = ({ wallet: 'wallets', card: 'cards' })[route] || route;

  const body = (() => {
    switch (route) {
      case 'pulse':   return <PulseScreen onOpenCard={() => setRoute('card')} onOpenLive={() => setRoute('live')} />;
      case 'tiers':   return <TiersScreen onOpenCard={() => setRoute('card')} />;
      case 'wallets': return <WalletsScreen onOpenWallet={() => setRoute('wallet')} />;
      case 'wallet':  return <WalletDetailScreen onBack={() => setRoute('wallets')} />;
      case 'cards':   return <CardsScreen onOpenCard={() => setRoute('card')} />;
      case 'card':    return <CardDetailScreen onBack={() => setRoute('cards')} />;
      case 'live':    return <LiveScreen />;
      default:        return null;
    }
  })();

  const meta = TITLES[route];

  const handleNavigateFromSearch = (target) => {
    setSearchOpen(false);
    setRoute(target);
  };

  return (
    <Shell
      active={activeTab}
      onNav={(id) => { setSearchOpen(false); setRoute(id); }}
      title={meta.title} sub={meta.sub}
      onSearch={() => setSearchOpen(true)}
      onInfo={() => setCaveatOpen(true)}
      overlay={
        <>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleNavigateFromSearch}/>
          <CaveatSheet open={caveatOpen} onClose={() => setCaveatOpen(false)}/>
        </>
      }
    >
      {body}
    </Shell>
  );
}

Object.assign(window, {
  AppScreen, PulseScreen, TiersScreen, WalletsScreen,
  WalletDetailScreen, CardsScreen, CardDetailScreen, LiveScreen,
  Shell, P,
});
