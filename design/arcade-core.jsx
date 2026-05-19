// MnStr · Arcade CRT — core palette, helpers, shell
// Phosphor terminal aesthetic. Mono everything, ASCII bars, scanlines.

const A = {
  bg:    'oklch(0.09 0 0)',
  bg2:   'oklch(0.11 0.01 142)',
  bg3:   'oklch(0.13 0.02 142)',
  text:  'oklch(0.92 0.18 142)',   // bright phosphor
  text2: 'oklch(0.74 0.16 142)',
  text3: 'oklch(0.55 0.13 142)',
  text4: 'oklch(0.38 0.10 142)',
  warn:  'oklch(0.85 0.18 65)',    // amber jackpot
  bad:   'oklch(0.72 0.22 25)',
  rule:  'oklch(0.28 0.05 142)',
  mono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  retro: '"VT323", "JetBrains Mono", ui-monospace, monospace',
};

// ─── Inline mono helper ───
function aM(text, style = {}) {
  return <span style={{ fontFamily: A.mono, fontVariantNumeric: 'tabular-nums', ...style }}>{text}</span>;
}

// ─── ASCII bar — block characters proportional ───
function AsciiBar({ value, width = 12, color = A.text }) {
  const fill = Math.max(0, Math.min(width, Math.round((value / 100) * width)));
  const empty = width - fill;
  return (
    <span style={{ color, letterSpacing: 0, fontFamily: A.mono }}>
      {'█'.repeat(fill)}<span style={{ color: A.text4 }}>{'░'.repeat(empty)}</span>
    </span>
  );
}

// ─── Boxed section w/ ASCII title bar ───
function AsciiBox({ title, color = A.text, glow, children, style = {} }) {
  return (
    <div style={{ margin: '14px 14px 0', fontFamily: A.mono, ...style }}>
      <div style={{
        color, fontSize: 10, lineHeight: 1, letterSpacing: 0,
        whiteSpace: 'pre', textShadow: glow ? `0 0 8px ${color}88` : 'none',
      }}>
        {'┌─ '}<span style={{ background: A.bg, padding: '0 2px' }}>{title}</span>{' ' + '─'.repeat(Math.max(2, 34 - title.length)) + '┐'}
      </div>
      <div style={{
        padding: '10px 12px',
        border: `1px solid ${color}`,
        borderTop: 'none',
        background: A.bg2,
        boxShadow: glow ? `0 0 0 1px ${color}22, inset 0 0 24px ${color}11` : 'none',
      }}>{children}</div>
    </div>
  );
}

// ─── Tier badge ───
function ATier({ tier }) {
  const m = {
    Starter: { c: 'oklch(0.72 0.14 240)', l: 'STA' },
    Premium: { c: A.warn, l: 'PRE' },
    Ultra:   { c: 'oklch(0.72 0.18 340)', l: 'ULT' },
  }[tier] || { c: A.text3, l: '···' };
  return (
    <span style={{
      fontFamily: A.mono, fontSize: 9, letterSpacing: '0.06em',
      padding: '1px 5px', border: `1px solid ${m.c}`,
      color: m.c, background: A.bg,
    }}>[{m.l}]</span>
  );
}

// ─── Status pill ───
function AStatus({ status }) {
  const m = {
    holding:   { c: A.text,  t: 'HOLD' },
    sold_back: { c: A.bad,   t: 'SOLD' },
    redeemed:  { c: 'oklch(0.72 0.14 240)', t: 'RDM ' },
  }[status] || { c: A.text3, t: '????' };
  return <span style={{ fontFamily: A.mono, fontSize: 9, color: m.c, letterSpacing: '0.04em' }}>[{m.t}]</span>;
}

// ─── Card slot (ASCII frame, hashed fill) ───
function ACardSlot({ fmv, psa = 'PSA10', tier, hot, chase, style = {} }) {
  return (
    <div style={{
      aspectRatio: '5/7',
      background: `
        repeating-linear-gradient(45deg, ${A.bg3} 0 3px, transparent 3px 6px),
        ${A.bg2}
      `,
      border: `1px solid ${hot ? A.warn : A.text3}`,
      boxShadow: hot ? `0 0 0 1px ${A.warn}44, 0 0 16px ${A.warn}33` : 'none',
      position: 'relative',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 6, fontFamily: A.mono,
      ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, color: hot ? A.warn : A.text2, letterSpacing: '0.04em' }}>{psa}</span>
        {chase && <span style={{ fontSize: 7.5, color: A.warn, letterSpacing: '0.08em' }}>CHS</span>}
      </div>
      <div>
        <div style={{
          height: 12, marginBottom: 4,
          backgroundImage: `repeating-linear-gradient(0deg, ${A.text}33 0 1px, transparent 1px 3px)`,
          opacity: 0.4,
        }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: hot ? A.warn : A.text }}>${fmv}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Top bar with action buttons ───
function ATopBar({ title, sub, onSearch, onInfo }) {
  return (
    <div style={{
      paddingTop: 54, padding: '54px 14px 8px',
      background: A.bg,
      borderBottom: `1px solid ${A.rule}`,
      position: 'sticky', top: 0, zIndex: 20,
      fontFamily: A.mono,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: A.retro, fontSize: 20, color: A.text,
          textShadow: `0 0 8px ${A.text}88`, letterSpacing: '0.05em',
        }}>/MNSTR</span>
        <span style={{ color: A.text4, fontSize: 11 }}>::</span>
        <span style={{ color: A.text2, fontSize: 11, letterSpacing: '0.08em' }}>{title}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <ATopBarBlink/>
          <span style={{ color: A.text3, fontSize: 9, letterSpacing: '0.1em', marginRight: 4 }}>LIVE</span>
          {onSearch && (
            <button onClick={onSearch} style={{
              all: 'unset', cursor: 'pointer',
              padding: '2px 6px', border: `1px solid ${A.text3}`,
              color: A.text2, fontSize: 10, fontFamily: A.mono,
            }}>[/]</button>
          )}
          {onInfo && (
            <button onClick={onInfo} style={{
              all: 'unset', cursor: 'pointer',
              padding: '2px 6px', border: `1px solid ${A.text3}`,
              color: A.text2, fontSize: 10, fontFamily: A.mono,
            }}>[?]</button>
          )}
        </div>
      </div>
      {sub && (
        <div style={{ marginTop: 4, color: A.text4, fontSize: 9.5, letterSpacing: '0.04em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Function-key bottom nav ───
function ABottomNav({ active, onChange }) {
  const tabs = [
    { id: 'pulse',   k: 'F1', t: 'PULSE' },
    { id: 'tiers',   k: 'F2', t: 'TIERS' },
    { id: 'wallets', k: 'F3', t: 'WLT.' },
    { id: 'cards',   k: 'F4', t: 'CARDS' },
    { id: 'live',    k: 'F5', t: 'LIVE' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30,
      background: A.bg,
      borderTop: `1px solid ${A.text3}`,
      fontFamily: A.mono,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 2, padding: '6px 4px 4px',
      }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              padding: '7px 0',
              background: on ? A.text + '22' : 'transparent',
              border: `1px solid ${on ? A.text : A.text4}`,
              color: on ? A.text : A.text3,
              textShadow: on ? `0 0 6px ${A.text}` : 'none',
              fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.1em',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ color: A.text4, fontSize: 8 }}>[{t.k}]</span>
              <span>{t.t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scanline + vignette overlays (decorative) ───
function ACrtFx() {
  return (
    <>
      <div style={{
        pointerEvents: 'none',
        position: 'absolute', inset: 0, zIndex: 5,
        background: 'repeating-linear-gradient(0deg, oklch(1 0 0 / 0.025) 0px, oklch(1 0 0 / 0.025) 1px, transparent 1px, transparent 3px)',
      }}/>
      <div style={{
        pointerEvents: 'none',
        position: 'absolute', inset: 0, zIndex: 4,
        background: 'radial-gradient(ellipse at center, transparent 55%, oklch(0 0 0 / 0.5) 100%)',
      }}/>
    </>
  );
}

// ─── Top-bar blink dot — isolated so its tick doesn't re-render the shell ───
function ATopBarBlink() {
  const [on, setOn] = React.useState(true);
  React.useEffect(() => {
    const id = setInterval(() => setOn(b => !b), 700);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color: A.warn, fontSize: 10 }}>{on ? '●' : '○'}</span>;
}

// ─── Shell wrapper ───
function AShell({ active, onNav, title, sub, onSearch, onInfo, overlay, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: A.bg, color: A.text, fontFamily: A.mono,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 96, position: 'relative', zIndex: 1 }}>
        <ATopBar title={title} sub={sub} onSearch={onSearch} onInfo={onInfo}/>
        {children}
      </div>
      <ACrtFx/>
      <ABottomNav active={active} onChange={onNav}/>
      {overlay}
    </div>
  );
}

// ─── Section head ───
function AHead({ tag, title, right }) {
  return (
    <div style={{
      padding: '18px 14px 8px',
      display: 'flex', alignItems: 'baseline', gap: 8,
      fontFamily: A.mono,
    }}>
      <span style={{ color: A.text, fontSize: 10, letterSpacing: '0.1em' }}>{tag}</span>
      <span style={{ color: A.text2, fontSize: 10 }}>::</span>
      <span style={{ color: A.text2, fontSize: 11, letterSpacing: '0.04em' }}>{title}</span>
      {right && <span style={{ marginLeft: 'auto', color: A.text4, fontSize: 9, letterSpacing: '0.1em' }}>{right}</span>}
    </div>
  );
}

// ─── KPI cell — for grid use ───
function AKpi({ label, value, delta, dn }) {
  return (
    <div style={{
      border: `1px solid ${A.text4}`, background: A.bg2,
      padding: '8px 10px', fontFamily: A.mono,
    }}>
      <div style={{ color: A.text4, fontSize: 8, letterSpacing: '0.14em' }}>{label}</div>
      <div style={{ color: A.text, fontSize: 16, marginTop: 4, textShadow: `0 0 6px ${A.text}66` }}>{value}</div>
      {delta && (
        <div style={{ color: dn ? A.bad : A.text2, fontSize: 9, marginTop: 2 }}>
          {dn ? '▾' : '▴'} {delta}
        </div>
      )}
    </div>
  );
}

// ─── Time pivot ───
function ATimePivot({ value, onChange, options = ['24H', '7D', '30D', 'ALL'] }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${A.text3}`, fontFamily: A.mono }}>
      {options.map((o, i) => {
        const on = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '4px 8px',
            background: on ? A.text + '22' : 'transparent',
            color: on ? A.text : A.text3,
            borderRight: i === options.length - 1 ? 'none' : `1px solid ${A.text3}`,
            fontSize: 9.5, letterSpacing: '0.08em',
          }}>{o}</button>
        );
      })}
    </div>
  );
}

// ─── Caveat footer for any screen ───
function ACaveat({ lines }) {
  return (
    <div style={{ padding: '18px 14px 4px', color: A.text4, fontSize: 9.5, lineHeight: 1.7, fontFamily: A.mono }}>
      {lines.map((l, i) => <div key={i}>// {l}</div>)}
    </div>
  );
}

Object.assign(window, {
  A, aM, AsciiBar, AsciiBox,
  ATier, AStatus, ACardSlot,
  ATopBar, ABottomNav, ACrtFx, AShell, AHead, AKpi, ATimePivot, ACaveat,
});
