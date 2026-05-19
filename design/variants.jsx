// MnStr — mobile variants
// Three alternative aesthetic directions for the Pulse (home) screen.
// All share the bottom-nav pattern from the Foil Tactical default.
// Each variant defines its own palette + Shell + BottomNav + PulseScreen.

// ════════════════════════════════════════════════════════════════
// B · EDITORIAL
// Newspaper / financial weekend feature. Serif headlines, generous
// whitespace, monochrome with one electric accent.
// ════════════════════════════════════════════════════════════════

const E = {
  bg:    'oklch(0.11 0 0)',
  paper: 'oklch(0.14 0 0)',
  ink:   'oklch(0.97 0 0)',
  ink2:  'oklch(0.78 0 0)',
  ink3:  'oklch(0.55 0 0)',
  ink4:  'oklch(0.36 0 0)',
  rule:  'oklch(0.26 0 0)',
  lime:  'oklch(0.85 0.22 140)',
  red:   'oklch(0.72 0.22 25)',
  serif: '"Newsreader", "Times New Roman", Georgia, serif',
  sans:  '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono:  '"JetBrains Mono", ui-monospace, monospace',
};

function eM(children, style = {}) {
  return <span style={{ fontFamily: E.mono, fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>;
}

function EditorialBottomNav({ active = 'pulse', onChange = () => {} }) {
  const tabs = ['Pulse','Tiers','Wallets','Cards','Live'];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30, paddingTop: 10,
      background: `${E.bg}f2`,
      backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${E.rule}`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '4px 12px 6px',
      }}>
        {tabs.map((t) => {
          const id = t.toLowerCase();
          const on = id === active;
          return (
            <button key={t} onClick={() => onChange(id)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '4px 8px',
              position: 'relative',
            }}>
              <span style={{
                width: on ? 6 : 4, height: on ? 6 : 4,
                borderRadius: '50%',
                background: on ? E.lime : E.ink4,
                boxShadow: on ? `0 0 8px ${E.lime}` : 'none',
                transition: '200ms',
              }}/>
              <span style={{
                fontFamily: E.serif, fontSize: 12,
                fontStyle: 'italic',
                color: on ? E.ink : E.ink3,
                letterSpacing: '0.01em',
              }}>{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditorialPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0, background: E.bg, color: E.ink,
      fontFamily: E.sans, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Masthead */}
        <div style={{ paddingTop: 56, padding: '56px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: E.serif, fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
              Mn<span style={{ color: E.lime }}>·</span>Str
            </div>
            <div style={{ fontFamily: E.mono, fontSize: 9, color: E.ink3, letterSpacing: '0.14em' }}>
              ISS · 04 · MAY 2026
            </div>
          </div>
          <div style={{ height: 1, background: E.rule, marginTop: 10 }}/>
        </div>

        {/* Eyebrow + lede */}
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ fontFamily: E.mono, fontSize: 9.5, letterSpacing: '0.22em', color: E.lime }}>TODAY · 18 MAY · MONDAY</div>
          <div style={{
            fontFamily: E.serif, fontSize: 32, lineHeight: 1.08,
            fontWeight: 300, letterSpacing: '-0.025em',
            marginTop: 14,
          }}>
            A quiet morning in the vault, until <em style={{ color: E.lime, fontStyle: 'italic' }}>@phantasmagore</em> pulled a Celebi.
          </div>
          <div style={{
            fontFamily: E.serif, fontSize: 14, fontStyle: 'italic',
            color: E.ink2, lineHeight: 1.5, marginTop: 12,
          }}>
            412 packs opened. $184,500 cycled. The single biggest hit of the week — sold back in three minutes flat.
          </div>
        </div>

        {/* Big ledger */}
        <div style={{ padding: '32px 22px 0' }}>
          <div style={{ height: 1, background: E.rule }}/>
          <div style={{ padding: '18px 0 0' }}>
            <div style={{ fontFamily: E.mono, fontSize: 9.5, color: E.ink3, letterSpacing: '0.18em' }}>USDm CYCLED · 24h</div>
            <div style={{ fontFamily: E.serif, fontSize: 64, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 8 }}>
              $184<span style={{ color: E.ink3 }}>,</span>500
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 10 }}>
              {eM('+12.1%', { fontSize: 11, color: E.lime })}
              <span style={{ fontFamily: E.serif, fontSize: 13, fontStyle: 'italic', color: E.ink3 }}>vs yesterday</span>
            </div>
          </div>

          <div style={{ height: 1, background: E.rule, marginTop: 22 }}/>

          {/* Sub-ledger row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, padding: '18px 0' }}>
            {[
              { l: 'Packs', v: '412', d: '+8.2%' },
              { l: 'Payouts', v: '$67.8k', d: '−3.4%', dn: true },
              { l: 'Wallets', v: '189', d: '+18' },
            ].map((c) => (
              <div key={c.l}>
                <div style={{ fontFamily: E.mono, fontSize: 8.5, color: E.ink3, letterSpacing: '0.16em' }}>{c.l.toUpperCase()}</div>
                <div style={{ fontFamily: E.serif, fontSize: 26, marginTop: 4, letterSpacing: '-0.02em' }}>{c.v}</div>
                {eM(c.d, { fontSize: 9.5, color: c.dn ? E.red : E.lime, marginTop: 2, display: 'block' })}
              </div>
            ))}
          </div>
        </div>

        {/* Pulse chart — wandering line with a labeled peak */}
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ height: 1, background: E.rule }}/>
          <div style={{ padding: '18px 0 0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: E.serif, fontSize: 18, fontStyle: 'italic', letterSpacing: '-0.01em' }}>The day's pulse</div>
            {eM('PACKS/HR · 30D', { fontSize: 9.5, color: E.ink3, letterSpacing: '0.16em' })}
          </div>
          <svg viewBox="0 0 360 130" style={{ width: '100%', height: 140, display: 'block', marginTop: 12 }}>
            <path d="M0,100 C30,95 55,90 80,85 C110,75 130,85 160,70 C190,55 215,75 240,55 C265,40 290,60 320,30 L360,42" fill="none" stroke={E.ink2} strokeWidth="1.2"/>
            <circle cx="320" cy="30" r="3.5" fill={E.lime}/>
            <circle cx="320" cy="30" r="9" fill="none" stroke={E.lime} strokeWidth="0.7" opacity="0.6"/>
            <line x1="320" y1="30" x2="320" y2="120" stroke={E.rule} strokeDasharray="2 3"/>
            <text x="216" y="22" fontFamily={E.serif} fontStyle="italic" fontSize="11" fill={E.ink}>+1 Celebi at 18:14</text>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {eM('06:00', { fontSize: 9, color: E.ink4 })}
            {eM('NOW · 18:42', { fontSize: 9, color: E.ink4 })}
          </div>
        </div>

        {/* Featured pull */}
        <div style={{ padding: '32px 22px 0' }}>
          <div style={{ height: 1, background: E.rule }}/>
          <div style={{ padding: '20px 0 0' }}>
            <div style={{ fontFamily: E.mono, fontSize: 9, color: E.lime, letterSpacing: '0.22em' }}>HIT OF THE WEEK</div>
            <div style={{ fontFamily: E.serif, fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 10 }}>
              Shining Celebi, in the wild.
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
            <div style={{
              aspectRatio: '5/7',
              background: 'repeating-linear-gradient(135deg, oklch(0.20 0.01 70), oklch(0.20 0.01 70) 5px, oklch(0.16 0.01 70) 5px, oklch(0.16 0.01 70) 10px)',
              border: `1px solid ${E.rule}`,
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 0, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {eM('PSA 10', { fontSize: 8.5, color: E.lime, letterSpacing: '0.14em' })}
                {eM('$9,900', { fontSize: 12 })}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: E.serif, fontSize: 15, fontStyle: 'italic', color: E.ink2, lineHeight: 1.45 }}>
                "I'd been opening Ultras all morning and got nothing but commons. Then the slab loaded and I knew."
              </div>
              <div style={{ marginTop: 12, fontFamily: E.mono, fontSize: 9.5, color: E.ink3, letterSpacing: '0.1em' }}>
                — @phantasmagore, 14:21 UTC
              </div>
              <div style={{ height: 1, background: E.rule, margin: '12px 0' }}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  {eM('PAID', { fontSize: 8.5, color: E.ink3, letterSpacing: '0.16em' })}
                  <div style={{ fontFamily: E.serif, fontSize: 18, marginTop: 2 }}>$1,250</div>
                </div>
                <div>
                  {eM('RECEIVED', { fontSize: 8.5, color: E.ink3, letterSpacing: '0.16em' })}
                  <div style={{ fontFamily: E.serif, fontSize: 18, marginTop: 2, color: E.lime }}>$8,415</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier breakout */}
        <div style={{ padding: '32px 22px 0' }}>
          <div style={{ height: 1, background: E.rule }}/>
          <div style={{ padding: '18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: E.serif, fontSize: 18, fontStyle: 'italic' }}>Where the money went</div>
            {eM('ALL-TIME', { fontSize: 9.5, color: E.ink3, letterSpacing: '0.16em' })}
          </div>
          {[
            { n: 'Starter', sub: 'fifty dollars', share: 33, edge: '15.8%' },
            { n: 'Premium', sub: 'two-fifty',     share: 56, edge: '17.4%' },
            { n: 'Ultra',   sub: 'twelve-fifty',  share: 53, edge: '10.6%' },
          ].map((t) => (
            <div key={t.n} style={{ padding: '14px 0', borderTop: `1px solid ${E.rule}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: E.serif, fontSize: 20, letterSpacing: '-0.01em' }}>{t.n}</div>
                  <div style={{ fontFamily: E.serif, fontStyle: 'italic', fontSize: 12, color: E.ink3, marginTop: 1 }}>{t.sub}</div>
                </div>
                {eM(t.edge, { fontSize: 16, color: E.lime })}
              </div>
              <div style={{ height: 2, background: E.rule, marginTop: 8, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${t.share}%`, background: E.ink }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '32px 22px 0' }}>
          <div style={{ height: 1, background: E.rule }}/>
          <div style={{ padding: '14px 0 8px', fontFamily: E.serif, fontStyle: 'italic', fontSize: 12, color: E.ink4, lineHeight: 1.6 }}>
            All values are MnStr FMV — the figure the vault assigns each card at the moment of pull. They are not market consensus. Read with care.
          </div>
        </div>
      </div>

      <EditorialBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// C · VAULT
// Auction-house catalog. Ink-blue ground, brass accents, hairline
// rules, framed cards. Sotheby's meets a private bank.
// ════════════════════════════════════════════════════════════════

const V = {
  bg:     'oklch(0.13 0.025 250)',
  panel:  'oklch(0.17 0.03 250)',
  panel2: 'oklch(0.21 0.035 250)',
  ivory:  'oklch(0.96 0.018 90)',
  ivory2: 'oklch(0.84 0.025 90)',
  ivory3: 'oklch(0.65 0.025 90)',
  ivory4: 'oklch(0.48 0.025 90)',
  brass:  'oklch(0.80 0.13 75)',
  brassD: 'oklch(0.62 0.10 75)',
  rule:   'oklch(0.30 0.04 250)',
  mint:   'oklch(0.82 0.10 165)',
  rose:   'oklch(0.72 0.15 25)',
  serif:  '"EB Garamond", "Cormorant Garamond", "Times New Roman", serif',
  sans:   '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono:   '"JetBrains Mono", ui-monospace, monospace',
};

function vM(children, style = {}) {
  return <span style={{ fontFamily: V.mono, fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>;
}

function VaultBottomNav({ active = 'pulse', onChange = () => {} }) {
  const tabs = ['Pulse','Tiers','Wallets','Cards','Live'];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 30, paddingTop: 10,
      background: `${V.bg}f5`,
      backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${V.brassD}66`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 8px 4px' }}>
        {tabs.map((t) => {
          const id = t.toLowerCase();
          const on = id === active;
          return (
            <button key={t} onClick={() => onChange(id)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 8px',
              position: 'relative',
            }}>
              <span style={{
                fontFamily: V.serif, fontSize: 16,
                fontStyle: 'italic',
                color: on ? V.brass : V.ivory3,
                letterSpacing: '0.01em',
                textShadow: on ? `0 0 8px ${V.brass}44` : 'none',
              }}>{t}</span>
              <span style={{
                marginTop: 3,
                width: on ? 22 : 0, height: 1, background: V.brass,
                transition: '180ms',
              }}/>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VaultOrnament() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: V.brassD }}>
      <span style={{ flex: 1, height: 1, background: V.brassD, opacity: 0.5 }}/>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1 L13 7 L7 13 L1 7 Z" stroke={V.brass} strokeWidth="0.8" fill={V.brass} fillOpacity="0.18"/>
      </svg>
      <span style={{ flex: 1, height: 1, background: V.brassD, opacity: 0.5 }}/>
    </div>
  );
}

function VaultPulse() {
  const [tab, setTab] = React.useState('pulse');
  return (
    <div style={{
      position: 'absolute', inset: 0, background: V.bg, color: V.ivory,
      fontFamily: V.sans, overflow: 'hidden',
      backgroundImage: `radial-gradient(800px 400px at 50% 0%, oklch(0.20 0.04 250 / 0.6), transparent 70%)`,
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Masthead */}
        <div style={{ paddingTop: 60, padding: '60px 22px 0', textAlign: 'center' }}>
          {vM('THE VAULT · CATALOGUE', { fontSize: 9, color: V.brass, letterSpacing: '0.3em' })}
          <div style={{ fontFamily: V.serif, fontSize: 36, fontStyle: 'italic', letterSpacing: '-0.01em', marginTop: 8, lineHeight: 1 }}>
            Mn<span style={{ color: V.brass }}>·</span>Str
          </div>
          {vM('XVIII · V · MMXXVI', { fontSize: 9.5, color: V.ivory3, letterSpacing: '0.24em', marginTop: 8, display: 'block' })}
          <div style={{ marginTop: 12 }}><VaultOrnament/></div>
        </div>

        {/* Today's headline */}
        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 14, color: V.ivory2 }}>Today's record</div>
            <div style={{ fontFamily: V.serif, fontSize: 38, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 8, color: V.brass }}>
              $8,415
            </div>
            <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 13, color: V.ivory3, marginTop: 6 }}>
              realised on a single Ultra pack
            </div>
          </div>
        </div>

        {/* Featured acquisition — framed card with passe-partout */}
        <div style={{ padding: '24px 22px 0' }}>
          <VaultOrnament/>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            {vM('LOT 8417 · ACQUIRED 14:21 UTC', { fontSize: 9, color: V.brass, letterSpacing: '0.22em' })}
            <div style={{ fontFamily: V.serif, fontSize: 20, fontStyle: 'italic', marginTop: 8 }}>
              Shining Celebi
            </div>
            <div style={{ fontFamily: V.serif, fontSize: 13, color: V.ivory3, marginTop: 2 }}>
              1st Edition · Neo Destiny · MMII
            </div>
          </div>

          <div style={{
            marginTop: 18,
            background: V.panel,
            border: `1px solid ${V.brassD}55`,
            padding: 18,
          }}>
            <div style={{
              border: `1px solid ${V.brass}44`,
              padding: 14,
              background: V.panel2,
            }}>
              <div style={{
                aspectRatio: '5/7',
                background: `
                  radial-gradient(circle at 30% 22%, ${V.brass}33, transparent 50%),
                  repeating-linear-gradient(135deg, oklch(0.25 0.025 250), oklch(0.25 0.025 250) 6px, oklch(0.20 0.02 250) 6px, oklch(0.20 0.02 250) 12px)
                `,
                border: `1px solid ${V.brass}`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between' }}>
                  {vM('PSA · 10', { fontSize: 9.5, color: V.brass, letterSpacing: '0.18em' })}
                  {vM('#106', { fontSize: 9.5, color: V.ivory3, letterSpacing: '0.14em' })}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 12, color: V.ivory3 }}>fair market value</div>
                <div style={{ fontFamily: V.serif, fontSize: 26, marginTop: 2 }}>$9,900</div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ textAlign: 'center', borderRight: `1px solid ${V.rule}`, paddingRight: 14 }}>
                <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 11, color: V.ivory3 }}>consigned by</div>
                <div style={{ fontFamily: V.serif, fontSize: 16, marginTop: 2 }}>@phantasmagore</div>
              </div>
              <div style={{ textAlign: 'center', paddingLeft: 14 }}>
                <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 11, color: V.ivory3 }}>realised</div>
                <div style={{ fontFamily: V.serif, fontSize: 16, marginTop: 2, color: V.brass }}>$8,415</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI grid — 2x2 framed tiles */}
        <div style={{ padding: '28px 22px 0' }}>
          <VaultOrnament/>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            {vM('LEDGER · LAST 24 HOURS', { fontSize: 9, color: V.brass, letterSpacing: '0.22em' })}
          </div>

          <div style={{
            marginTop: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            border: `1px solid ${V.brassD}66`,
          }}>
            {[
              { l: 'packs opened',     v: '412',     d: '+8.2%' },
              { l: 'volume cycled',    v: '$184.5k', d: '+12.1%' },
              { l: 'paid to consignors', v: '$67.8k', d: '−3.4%', dn: true },
              { l: 'unique participants', v: '189',  d: '+18'    },
            ].map((c, i) => (
              <div key={i} style={{
                padding: '16px 14px',
                borderRight: i % 2 === 0 ? `1px solid ${V.rule}` : 'none',
                borderTop: i >= 2 ? `1px solid ${V.rule}` : 'none',
                background: V.panel,
              }}>
                <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 11, color: V.ivory3 }}>{c.l}</div>
                <div style={{ fontFamily: V.serif, fontSize: 24, marginTop: 4, letterSpacing: '-0.01em' }}>{c.v}</div>
                {vM(c.d, { fontSize: 9, color: c.dn ? V.rose : V.mint, marginTop: 4, display: 'block', letterSpacing: '0.1em' })}
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions register */}
        <div style={{ padding: '28px 22px 0' }}>
          <VaultOrnament/>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            {vM('REGISTER · TODAY', { fontSize: 9, color: V.brass, letterSpacing: '0.22em' })}
          </div>

          <div style={{ marginTop: 14, background: V.panel, border: `1px solid ${V.brassD}55` }}>
            {[
              { t: '14:21', who: '@phantasmagore', card: 'Shining Celebi 1ed',     amt: '+$8,415', tone: 'pos', tier: 'Ultra' },
              { t: '12:08', who: '@kage',          card: 'Mewtwo Jungle Holo',     amt: '$312 held', tier: 'Premium' },
              { t: '11:46', who: '@yumi',          card: 'Sprigatito McD #017',    amt: '+$29.75', tone: 'pos', tier: 'Starter' },
              { t: '11:02', who: '0x7c…91a4',      card: 'Eevee Evolutions',       amt: '$142 held', tier: 'Starter' },
              { t: '10:21', who: '@aether',        card: 'Gengar Fossil 1ed',      amt: '+$1,640', tone: 'pos', tier: 'Premium' },
              { t: '09:48', who: '0xbb…aa10',      card: 'Pikachu Black Star #058', amt: '+$42',   tone: 'pos', tier: 'Starter' },
            ].map((r, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${V.rule}`,
                display: 'grid', gridTemplateColumns: '40px 1fr auto',
                gap: 10, alignItems: 'center',
              }}>
                <div>
                  {vM(r.t, { fontSize: 10, color: V.brassD })}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: V.serif, fontSize: 13, color: V.ivory, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.card}</div>
                  {vM(`${r.who} · ${r.tier}`, { fontSize: 9, color: V.ivory4, letterSpacing: '0.08em' })}
                </div>
                <div style={{ fontFamily: V.serif, fontSize: 14, color: r.tone === 'pos' ? V.brass : V.ivory2, fontStyle: r.tone === 'pos' ? 'normal' : 'italic' }}>
                  {r.amt}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer ornament */}
        <div style={{ padding: '32px 22px 0' }}>
          <VaultOrnament/>
          <div style={{ textAlign: 'center', padding: '14px 0 8px' }}>
            <div style={{ fontFamily: V.serif, fontStyle: 'italic', fontSize: 11.5, color: V.ivory4, lineHeight: 1.6 }}>
              Values reflect MnStr's appraisal at time of pull. Cards are physical PSA slabs, held in trust.
            </div>
          </div>
        </div>
      </div>

      <VaultBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// D · ARCADE CRT
// Terminal. Mono everything, ASCII bars, phosphor green, scanlines.
// Leans hardest into the "gacha" side.
// ════════════════════════════════════════════════════════════════

const A = {
  bg:    'oklch(0.09 0 0)',
  panel: 'oklch(0.12 0 0)',
  text:  'oklch(0.92 0.18 142)',
  text2: 'oklch(0.74 0.16 142)',
  text3: 'oklch(0.55 0.13 142)',
  text4: 'oklch(0.38 0.10 142)',
  warn:  'oklch(0.85 0.18 65)',
  bad:   'oklch(0.72 0.22 25)',
  rule:  'oklch(0.28 0.05 142)',
  mono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  retro: '"VT323", "JetBrains Mono", ui-monospace, monospace',
};

function aM(children, style = {}) {
  return <span style={{ fontFamily: A.mono, fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>;
}

function ArcadeBottomNav({ active = 'pulse', onChange = () => {} }) {
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

function AsciiBar({ value, width = 16, char = '█', empty = '░', color = A.text }) {
  const fill = Math.round((value / 100) * width);
  return (
    <span style={{ color, letterSpacing: 0 }}>
      {char.repeat(fill)}<span style={{ color: A.text4 }}>{empty.repeat(width - fill)}</span>
    </span>
  );
}

function AsciiBox({ title, children, color = A.text }) {
  return (
    <div style={{ margin: '14px 14px 0', fontFamily: A.mono }}>
      <div style={{ color, fontSize: 10, lineHeight: 1, letterSpacing: 0, whiteSpace: 'pre' }}>
        {'┌─ '}<span style={{ background: A.bg, padding: '0 2px' }}>{title}</span>{' ' + '─'.repeat(Math.max(2, 36 - title.length)) + '┐'}
      </div>
      <div style={{
        padding: '10px 12px',
        border: `1px solid ${color}`,
        borderTop: 'none',
        background: A.panel,
      }}>{children}</div>
    </div>
  );
}

function ArcadePulse() {
  const [tab, setTab] = React.useState('pulse');
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 700);
    return () => clearInterval(id);
  }, []);
  const blink = t % 2 === 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: A.bg, color: A.text,
      fontFamily: A.mono, overflow: 'hidden',
    }}>
      {/* scanline overlay */}
      <div style={{
        pointerEvents: 'none',
        position: 'absolute', inset: 0, zIndex: 5,
        background: 'repeating-linear-gradient(0deg, oklch(1 0 0 / 0.02) 0px, oklch(1 0 0 / 0.02) 1px, transparent 1px, transparent 3px)',
      }}/>
      {/* vignette */}
      <div style={{
        pointerEvents: 'none',
        position: 'absolute', inset: 0, zIndex: 4,
        background: 'radial-gradient(ellipse at center, transparent 50%, oklch(0 0 0 / 0.45) 100%)',
      }}/>

      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 100, zIndex: 1 }}>
        {/* Header */}
        <div style={{ paddingTop: 60, padding: '60px 14px 0' }}>
          <div style={{ fontFamily: A.retro, fontSize: 36, lineHeight: 1, color: A.text, textShadow: `0 0 12px ${A.text}88`, letterSpacing: '0.04em' }}>
            /MNSTR_TERMINAL{blink && <span style={{ color: A.text, marginLeft: 4 }}>▌</span>}
          </div>
          <div style={{ marginTop: 6, color: A.text3, fontSize: 10, letterSpacing: 0 }}>
            <span style={{ color: A.text2 }}>v0.4.1</span> // session 88421 // chain megaeth:4326 // block 8,421,337
          </div>
          <div style={{ marginTop: 6, color: A.text2, fontSize: 11 }}>
            <span style={{ color: A.warn }}>●</span> SYS.READY <span style={{ color: A.text4 }}>···</span> POLL T+003s <span style={{ color: A.text4 }}>···</span> LAT 42ms
          </div>
        </div>

        {/* KPI ascii grid */}
        <AsciiBox title="LEDGER.24H">
          <table style={{ width: '100%', fontSize: 10.5, color: A.text2, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { k: 'PACKS_24H', v: '00412', bar: 62, d: '+8.2%', up: true },
                { k: 'USDM_VOL ', v: '184.5k', bar: 78, d: '+12.1%', up: true },
                { k: 'PAYOUTS  ', v: ' 67.8k', bar: 34, d: '-3.4%', up: false },
                { k: 'WALLETS  ', v: '00189 ', bar: 48, d: '+18',   up: true },
                { k: 'PACKS_ALL', v: ' 40127', bar: 100, d: 'ATH',  up: true },
                { k: 'USDM_ALL ', v: ' 4.31M', bar: 100, d: 'ATH',  up: true },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ color: A.text4, paddingRight: 8, fontSize: 9.5 }}>{r.k}</td>
                  <td style={{ paddingRight: 6, color: A.text }}><AsciiBar value={r.bar} width={12}/></td>
                  <td style={{ color: A.text, paddingRight: 8 }}>{r.v}</td>
                  <td style={{ color: r.up ? A.text : A.bad, fontSize: 9.5, textAlign: 'right' }}>{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AsciiBox>

        {/* ASCII chart */}
        <AsciiBox title="VELOCITY.30D">
          <div style={{ fontSize: 10.5, color: A.text2 }}>
            <div style={{ color: A.text3, marginBottom: 8 }}>packs/day [stacked: S | P | U]</div>
            <div style={{ fontFamily: A.mono, fontSize: 11, letterSpacing: '0.04em', lineHeight: 1.2, color: A.text, whiteSpace: 'pre' }}>
{`▁▁▂▂▃▃▄▄▅▄▄▅▅▆▆▇▇▆▆▇█▇▇█████▇█
▂▂▃▃▄▄▅▅▆▆▇▆▆▇▇▇█████████▇████
▁▁▂▂▃▃▃▄▄▄▅▅▅▆▆▆▇▇▇█████▇█████`}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: A.text4, fontSize: 9.5 }}>
              <span>-30D</span><span>-15D</span><span>NOW</span>
            </div>
          </div>
        </AsciiBox>

        {/* Tier stats */}
        <AsciiBox title="TIERS.EDGE">
          <table style={{ width: '100%', fontSize: 10.5, borderCollapse: 'collapse' }}>
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

        {/* Live log */}
        <AsciiBox title="STREAM.LIVE" color={A.text}>
          <div style={{ fontSize: 10.5, lineHeight: 1.7, fontFamily: A.mono }}>
            {[
              { t: '14s', tier: 'ULTRA  ', who: '@phantasmagore', act: 'SOLD',  amt: '+$8,415', big: true },
              { t: '42s', tier: 'PREMIUM', who: '@kage         ', act: 'HOLD',  amt: '$312   ' },
              { t: '01m', tier: 'STARTER', who: '0x7c…91a4    ', act: 'HOLD',  amt: '$35    ' },
              { t: '02m', tier: 'STARTER', who: '@yumi         ', act: 'SOLD',  amt: '$29.75 ' },
              { t: '03m', tier: 'PREMIUM', who: '@aether       ', act: 'SOLD',  amt: '$212   ' },
              { t: '04m', tier: 'STARTER', who: '0xbb…aa10    ', act: 'SOLD',  amt: '$42    ' },
            ].map((r, i) => (
              <div key={i} style={{ color: r.big ? A.warn : A.text2, textShadow: r.big ? `0 0 8px ${A.warn}` : 'none', whiteSpace: 'pre' }}>
                <span style={{ color: A.text4 }}>[{r.t}]</span> <span style={{ color: A.text3 }}>{r.tier}</span> {r.who} <span style={{ color: r.act === 'SOLD' ? A.bad : A.text }}>{r.act}</span> <span style={{ color: r.big ? A.warn : A.text }}>{r.amt}</span>
              </div>
            ))}
            <div style={{ marginTop: 6, color: A.text4 }}>
              {blink && <span>▌</span>}
            </div>
          </div>
        </AsciiBox>

        {/* Big hit banner */}
        <div style={{ margin: '14px 14px 0', padding: '12px 14px', border: `1px solid ${A.warn}`, background: A.warn + '11', position: 'relative' }}>
          <div style={{ color: A.warn, fontSize: 11, letterSpacing: '0.16em', textShadow: `0 0 8px ${A.warn}` }}>
            !! JACKPOT_DETECTED !!
          </div>
          <div style={{ marginTop: 6, color: A.text, fontSize: 13 }}>
            SHINING_CELEBI_1ED_106.psa10
          </div>
          <div style={{ marginTop: 4, color: A.text3, fontSize: 10 }}>
            @phantasmagore // ULTRA // FMV $9,900 // sold +$8,415
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 14px 0', color: A.text4, fontSize: 9.5, lineHeight: 1.7 }}>
          {'// MnStr FMV is the vault\'s appraisal, not market consensus.'}<br/>
          {'// cards are physical PSA slabs. chain stores receipt only.'}<br/>
          <span style={{ color: A.text3 }}>{'> '}</span><span>END_OF_BUFFER{blink && '▌'}</span>
        </div>
      </div>

      <ArcadeBottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

Object.assign(window, {
  EditorialPulse, VaultPulse, ArcadePulse,
});
