// MnStr · Arcade CRT — Wallets, Wallet detail, Cards, Card detail

// ════════════════════════════════════════════════════════════════
// WALLETS
// ════════════════════════════════════════════════════════════════
function AWalletsScreen({ onOpenWallet }) {
  const [sort, setSort] = React.useState('PNL');
  const [q, setQ] = React.useState('');
  const [shown, setShown] = React.useState(8);

  const rows = [
    { rank: 1,  handle: 'phantasmagore', addr: '0xa1…02f3', pulls: '218', spend: '$104.5K', pnl: '+$48,210', pos: true },
    { rank: 2,  handle: 'kage',          addr: '0x3c…150e', pulls: '412', spend: '$78.2K',  pnl: '+$18,200', pos: true },
    { rank: 3,  handle: 'yumi',          addr: '0x8a…42de', pulls: '98',  spend: '$42.0K',  pnl: '+$9,100',  pos: true },
    { rank: 4,  handle: null,            addr: '0x7c…91a4', pulls: '684', spend: '$34.2K',  pnl: '-$12,100', pos: false },
    { rank: 5,  handle: 'aether',        addr: '0x9e…04bd', pulls: '52',  spend: '$28.7K',  pnl: '-$16,300', pos: false },
    { rank: 6,  handle: 'solo',          addr: '0xbb…aa10', pulls: '31',  spend: '$15.1K',  pnl: '-$10,900', pos: false },
    { rank: 7,  handle: 'nightside',     addr: '0x12…99ee', pulls: '146', spend: '$22.4K',  pnl: '+$6,420',  pos: true },
    { rank: 8,  handle: null,            addr: '0x55…0a44', pulls: '208', spend: '$10.4K',  pnl: '-$3,180',  pos: false },
    { rank: 9,  handle: 'glimmer',       addr: '0x21…77bc', pulls: '64',  spend: '$18.2K',  pnl: '+$4,120',  pos: true },
    { rank: 10, handle: 'cobalt',        addr: '0xee…42af', pulls: '128', spend: '$16.8K',  pnl: '-$5,200',  pos: false },
    { rank: 11, handle: null,            addr: '0x09…3311', pulls: '92',  spend: '$11.6K',  pnl: '-$2,890',  pos: false },
    { rank: 12, handle: 'mira',          addr: '0xbe…0a01', pulls: '47',  spend: '$9.1K',   pnl: '+$1,640',  pos: true },
  ];
  const ql = q.trim().toLowerCase();
  const filtered = !ql ? rows : rows.filter(r => (r.handle || '').toLowerCase().includes(ql) || r.addr.toLowerCase().includes(ql));
  const visible = filtered.slice(0, shown);

  return (
    <>
      {/* Sort */}
      <div style={{ padding: '12px 14px 0', display: 'flex', gap: 4, fontFamily: A.mono }}>
        {[
          { id: 'PNL',  t: 'NET_PNL' },
          { id: 'SPN',  t: 'SPEND' },
          { id: 'PLS',  t: 'PULLS' },
        ].map((opt, i) => {
          const on = opt.id === sort;
          return (
            <button key={opt.id} onClick={() => setSort(opt.id)} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '6px 0',
              background: on ? A.text + '22' : 'transparent',
              border: `1px solid ${on ? A.text : A.text4}`,
              color: on ? A.text : A.text3,
              fontSize: 10, letterSpacing: '0.1em',
            }}>{opt.t}</button>
          );
        })}
      </div>

      <AWalletSearch value={q} onChange={(v) => { setQ(v); setShown(8); }} count={filtered.length === rows.length ? 1238 : filtered.length}/>

      {/* Top kpis */}
      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <AKpi label="WALLETS"    value="1,238" delta="+18"/>
        <AKpi label="TOP_1%_SHR" value="42%"/>
        <AKpi label="WINNERS"    value="38%"/>
      </div>

      {/* ASCII P&L ladder */}
      <AsciiBox title="PNL.LADDER">
        <div style={{ color: A.text3, fontSize: 9.5, fontFamily: A.mono, marginBottom: 6 }}>top 24 wallets · realised P&amp;L</div>
        <div style={{ fontFamily: A.mono, fontSize: 11, lineHeight: 1.2, letterSpacing: '-0.02em', whiteSpace: 'pre', color: A.text }}>
{`▆▆▅▅▅▄▄▃▃▂▂▁                  
            ▁▁▂▂▃▃▃▄▄▅▅▆▆▇▇
`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: A.mono, fontSize: 9, marginTop: 4 }}>
          <span style={{ color: A.text }}>+$48,210 ▴</span>
          <span style={{ color: A.bad }}>▾ -$36,400</span>
        </div>
      </AsciiBox>

      {/* Leaderboard */}
      <AsciiBox title={`TABLE.SORT_BY=${sort}`}>
        {filtered.length === 0 ? <AEmpty title="NO_WALLETS"/> : (
          <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
            {visible.map((r, i) => (
              <button key={r.rank} onClick={onOpenWallet} style={{
                all: 'unset', cursor: 'pointer', display: 'grid', width: '100%',
                gridTemplateColumns: '20px 24px 1fr auto', gap: 8,
                padding: '6px 0', alignItems: 'center',
                borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              }}>
                <span style={{ color: A.text4, fontSize: 10 }}>{String(r.rank).padStart(2, '0')}</span>
                <AIdenticon addr={r.addr.replace(/[…]/g, 'f') + '00'} size={22}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: A.text }}>{r.handle || r.addr}</div>
                  <div style={{ color: A.text4, fontSize: 9.5, marginTop: 1 }}>{r.handle ? r.addr : ''} {r.pulls} pulls · {r.spend}</div>
                </div>
                <span style={{ color: r.pos ? A.text : A.bad, textAlign: 'right' }}>{r.pnl}</span>
              </button>
            ))}
          </div>
        )}
      </AsciiBox>

      {filtered.length === rows.length && <ALoadMore remaining={1238 - shown} onLoad={() => setShown(s => s + 8)}/>}

      <ACaveat lines={[
        'net_pnl = spend − sold-back payouts − unrealised vault FMV of holdings.',
        'revalues on every poll.',
      ]}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// WALLET DETAIL
// ════════════════════════════════════════════════════════════════
function AWalletDetail({ onBack }) {
  return (
    <>
      <div style={{ padding: '12px 14px 0' }}>
        <button onClick={onBack} style={{
          all: 'unset', cursor: 'pointer',
          color: A.warn, fontFamily: A.mono, fontSize: 10, letterSpacing: '0.14em',
          padding: '3px 6px', border: `1px solid ${A.warn}55`,
        }}>[ESC] BACK_WALLETS</button>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'center', gap: 12, fontFamily: A.mono }}>
        <AIdenticon addr="0xa1b2c3a8aaee02f3" size={44}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: A.text, fontSize: 18, textShadow: `0 0 6px ${A.text}66` }}>@phantasmagore</div>
          <div style={{ color: A.text4, fontSize: 10, marginTop: 2 }}>0xa1b2c3…02f3 :: rank #1 :: 218 pulls</div>
        </div>
        <button style={{
          all: 'unset', cursor: 'pointer',
          padding: '4px 8px', border: `1px solid ${A.text3}`,
          color: A.text2, fontSize: 9.5, letterSpacing: '0.14em',
        }}>[S] SHARE</button>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <AKpi label="PULLS.ALL" value="218"/>
        <AKpi label="SPEND"     value="$104.5K"/>
        <AKpi label="PAYOUTS"   value="$152.7K"/>
      </div>

      <AsciiBox title="NET_PNL.REALISED" color={A.text} glow>
        <div style={{ fontFamily: A.mono }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ color: A.text, fontSize: 28, textShadow: `0 0 10px ${A.text}88` }}>+$48,210</span>
            <span style={{ color: A.text3, fontSize: 10 }}>● up 14d</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <AsciiBar value={92} width={22} color={A.text}/>
          </div>
          <table style={{ width: '100%', marginTop: 12, fontFamily: A.mono, fontSize: 10.5 }}>
            <tbody>
              <tr><td style={{ color: A.text4 }}>held_fmv</td><td style={{ textAlign: 'right', color: A.text }}>$22,400</td></tr>
              <tr><td style={{ color: A.text4 }}>sold_back</td><td style={{ textAlign: 'right', color: A.text }}>$130.3K</td></tr>
              <tr><td style={{ color: A.text4 }}>big_hits</td><td style={{ textAlign: 'right', color: A.warn }}>4</td></tr>
            </tbody>
          </table>
        </div>
      </AsciiBox>

      <AsciiBox title="TIER_MIX">
        <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
          {[
            { n: 'STARTER', count: 42,  bar: 18, c: 'oklch(0.72 0.14 240)' },
            { n: 'PREMIUM', count: 108, bar: 50, c: A.warn },
            { n: 'ULTRA',   count: 68,  bar: 32, c: 'oklch(0.72 0.18 340)' },
          ].map(t => (
            <div key={t.n} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 50px', gap: 8, padding: '4px 0', alignItems: 'center' }}>
              <span style={{ color: t.c }}>{t.n}</span>
              <span><AsciiBar value={t.bar * 2} width={14} color={t.c}/></span>
              <span style={{ textAlign: 'right', color: A.text }}>{t.count}p</span>
            </div>
          ))}
        </div>
      </AsciiBox>

      <AsciiBox title="COLLECTION · n=218">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { fmv: '9,900', hot: true },
            { fmv: '6,150', hot: true },
            { fmv: '3,420' },
            { fmv: '1,890', chase: true },
            { fmv: '1,540' },
            { fmv: '1,210' },
            { fmv: '840' },
            { fmv: '612' },
            { fmv: '312' },
          ].map((c, i) => <ACardSlot key={i} {...c}/>)}
        </div>
        <div style={{ marginTop: 10, textAlign: 'center', fontFamily: A.mono, fontSize: 10, color: A.text4 }}>// + 209 more</div>
      </AsciiBox>

      <AsciiBox title="RHYTHM.12W">
        <div style={{ color: A.text3, fontSize: 9.5, fontFamily: A.mono }}>pulls per week · ★ = big hit</div>
        <div style={{ marginTop: 8, fontFamily: A.mono, fontSize: 16, lineHeight: 1, letterSpacing: '0.1em', color: A.text, whiteSpace: 'pre' }}>
{`▁▂▂▃ ▃▄ ▃ █  ▅ ▄ ▇ █
      ★      ★      ★`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: A.mono, fontSize: 9, color: A.text4 }}>
          <span>-12W</span><span>NOW</span>
        </div>
      </AsciiBox>

      <AsciiBox title="NEIGHBOURS.±3">
        <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
          {[
            { rank: 1, h: 'phantasmagore', a: '0xa1…02f3', pnl: '+$48,210', here: true },
            { rank: 2, h: 'kage',          a: '0x3c…150e', pnl: '+$18,200' },
            { rank: 3, h: 'yumi',          a: '0x8a…42de', pnl: '+$9,100' },
            { rank: 4, h: null,            a: '0x7c…91a4', pnl: '-$12,100', neg: true },
          ].map((n, i) => (
            <div key={n.rank} style={{
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              display: 'grid', gridTemplateColumns: '24px 24px 1fr auto', gap: 8, alignItems: 'center',
              background: n.here ? A.warn + '11' : 'transparent',
            }}>
              <span style={{ color: n.here ? A.warn : A.text4 }}>{String(n.rank).padStart(2, '0')}</span>
              <AIdenticon addr={n.a.replace(/[…]/g, 'f') + '00'} size={20}/>
              <div>
                <span style={{ color: A.text }}>{n.h || n.a}</span>
                {n.here && <span style={{ color: A.warn, fontSize: 9, marginLeft: 5 }}>// YOU</span>}
              </div>
              <span style={{ color: n.neg ? A.bad : A.text, textAlign: 'right' }}>{n.pnl}</span>
            </div>
          ))}
        </div>
      </AsciiBox>

      <ACaveat lines={[
        'wallet ↔ username via MnStr profile · public, voluntary.',
        'net_pnl revalues on every poll as held cards re-price.',
      ]}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// CARDS
// ════════════════════════════════════════════════════════════════
function ACardsScreen({ onOpenCard }) {
  const [view, setView] = React.useState('TOP_HITS');
  const [tier, setTier] = React.useState('ALL');
  const [q, setQ] = React.useState('');
  const [shown, setShown] = React.useState(12);

  const cards = [
    { fmv: '9,900', psa: 'PSA10', tier: 'Ultra',   hot: true,   title: 'shining_celebi_1ed_106',   set: 'neo_destiny' },
    { fmv: '6,150', psa: 'PSA10', tier: 'Ultra',   hot: true,   title: 'charizard_base_holo',      set: 'base_set' },
    { fmv: '3,420', psa: 'PSA10', tier: 'Premium',              title: 'lugia_neo_genesis_1ed',    set: 'neo_genesis' },
    { fmv: '2,180', psa: 'PSA9',  tier: 'Premium',              title: 'mewtwo_jungle_holo',       set: 'jungle' },
    { fmv: '1,890', psa: 'PSA10', tier: 'Ultra',   chase: true, title: 'blastoise_base_1ed',       set: 'base_set' },
    { fmv: '1,540', psa: 'PSA10', tier: 'Ultra',                title: 'gengar_fossil_1ed',        set: 'fossil' },
    { fmv: '1,310', psa: 'PSA9',  tier: 'Premium',              title: 'venusaur_base_holo',       set: 'base_set' },
    { fmv: '1,210', psa: 'PSA10', tier: 'Premium',              title: 'alakazam_base_1ed',        set: 'base_set' },
    { fmv: '1,080', psa: 'PSA10', tier: 'Ultra',   chase: true, title: 'raichu_base_1ed',          set: 'base_set' },
    { fmv: '960',   psa: 'PSA9',  tier: 'Premium',              title: 'machamp_base_holo',        set: 'base_set' },
    { fmv: '880',   psa: 'PSA10', tier: 'Premium',              title: 'nidoking_base_1ed',        set: 'base_set' },
    { fmv: '840',   psa: 'PSA10', tier: 'Premium',              title: 'ninetales_base_1ed',       set: 'base_set' },
    { fmv: '720',   psa: 'PSA10', tier: 'Premium',              title: 'hitmonchan_base_1ed',      set: 'base_set' },
    { fmv: '640',   psa: 'PSA10', tier: 'Premium',              title: 'magneton_base_1ed',        set: 'base_set' },
    { fmv: '384',   psa: 'PSA10', tier: 'Starter',              title: 'sprigatito_mcd_017',       set: 'jpn_mp_promo' },
    { fmv: '218',   psa: 'PSA10', tier: 'Starter',              title: 'pikachu_promo_058',        set: 'black_star' },
  ];
  const ql = q.trim().toLowerCase();
  const filtered = cards.filter(c => {
    if (tier !== 'ALL' && c.tier.toUpperCase() !== tier) return false;
    if (view === 'CHASE' && !c.chase) return false;
    if (ql && !c.title.toLowerCase().includes(ql) && !c.set.toLowerCase().includes(ql)) return false;
    return true;
  });
  const visible = filtered.slice(0, shown);

  return (
    <>
      {/* View filter chips */}
      <div style={{ padding: '12px 14px 0', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {['TOP_HITS', 'MOST_PULLED', 'CHASE', 'RECENT'].map(v => {
          const on = v === view;
          return (
            <button key={v} onClick={() => { setView(v); setShown(12); }} style={{
              all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap',
              padding: '5px 10px',
              background: on ? A.text + '22' : A.bg2,
              border: `1px solid ${on ? A.text : A.text4}`,
              color: on ? A.text : A.text3,
              fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.08em',
            }}>{v}</button>
          );
        })}
      </div>

      {/* Tier chips */}
      <div style={{ padding: '8px 14px 0', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {['ALL', 'STARTER', 'PREMIUM', 'ULTRA'].map(t => {
          const on = t === tier;
          return (
            <button key={t} onClick={() => { setTier(t); setShown(12); }} style={{
              all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap',
              padding: '4px 9px',
              background: on ? A.warn + '22' : A.bg2,
              border: `1px solid ${on ? A.warn : A.text4}`,
              color: on ? A.warn : A.text3,
              fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.08em',
            }}>{t}</button>
          );
        })}
      </div>

      <ACardSearch value={q} onChange={(v) => { setQ(v); setShown(12); }} count={filtered.length}/>

      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <AKpi label="CARDS.VAULT"  value="2,184"/>
        <AKpi label="CHASE.LEFT"   value="14 / 42"/>
      </div>

      <AsciiBox title="THE_WALL">
        {filtered.length === 0 ? <AEmpty title="NO_CARDS"/> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {visible.map((c, i) => (
              <button key={i} onClick={onOpenCard} style={{ all: 'unset', cursor: 'pointer' }}>
                <ACardSlot {...c}/>
              </button>
            ))}
          </div>
        )}
      </AsciiBox>

      {filtered.length > 0 && q.trim() === '' && <ALoadMore remaining={2184 - shown} onLoad={() => setShown(s => s + 8)}/>}

      <ACaveat lines={[
        'cards are physical PSA-graded slabs in MnStr vault. NOT NFTs.',
        'chase pool tracks publicly-seeded cards. per-pack odds not derived.',
      ]}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// CARD DETAIL
// ════════════════════════════════════════════════════════════════
function ACardDetail({ onBack }) {
  return (
    <>
      <div style={{ padding: '12px 14px 0' }}>
        <button onClick={onBack} style={{
          all: 'unset', cursor: 'pointer',
          color: A.warn, fontFamily: A.mono, fontSize: 10, letterSpacing: '0.14em',
          padding: '3px 6px', border: `1px solid ${A.warn}55`,
        }}>[ESC] BACK_CARDS</button>
      </div>

      <div style={{ padding: '14px 14px 0', fontFamily: A.mono }}>
        <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.16em' }}>// NEO_DESTINY · 2002 · PSA10</div>
        <div style={{ color: A.text, fontSize: 20, marginTop: 6, textShadow: `0 0 8px ${A.text}66`, lineHeight: 1.2 }}>
          SHINING_CELEBI_1ED_106
        </div>
        <div style={{ color: A.text4, fontSize: 10, marginTop: 4 }}>cert 6392-8940 // slug bnded-celebi-106</div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        <div style={{
          aspectRatio: '5/7',
          background: `
            radial-gradient(circle at 30% 25%, ${A.warn}33, transparent 50%),
            repeating-linear-gradient(45deg, ${A.bg3} 0 4px, transparent 4px 8px),
            ${A.bg2}
          `,
          border: `1px solid ${A.warn}`,
          boxShadow: `0 0 0 1px ${A.warn}33, 0 0 32px ${A.warn}22`,
          position: 'relative',
          fontFamily: A.mono,
        }}>
          <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: A.warn, fontSize: 11, letterSpacing: '0.18em' }}>PSA · 10</span>
            <span style={{ color: A.text3, fontSize: 10, letterSpacing: '0.1em' }}>SHINING_CELEBI</span>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: A.text4, fontSize: 9, letterSpacing: '0.1em' }}>FMV_LAST_PULL</div>
              <div style={{ color: A.text, fontSize: 20, marginTop: 2, textShadow: `0 0 8px ${A.text}66` }}>$9,900</div>
            </div>
            <div style={{ color: A.text4, fontSize: 9, letterSpacing: '0.1em' }}>1ED · #106</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <AKpi label="PULLED"   value="1"/>
        <AKpi label="IN_VAULT" value="NO" delta="sold-back"/>
        <AKpi label="FMV"      value="$9,900"/>
      </div>

      <AsciiBox title="HISTORY · n=1">
        <div style={{ fontFamily: A.mono, fontSize: 10.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: A.text }}>@phantasmagore</div>
              <div style={{ color: A.text4, fontSize: 9.5, marginTop: 2 }}>0xa1…02f3 // 03 Apr 2026 // 14:21 UTC</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <ATier tier="Ultra"/>
              <div style={{ color: A.text3, fontSize: 9, marginTop: 3 }}>paid $1,250</div>
            </div>
          </div>
          <div style={{
            marginTop: 10, padding: '6px 10px',
            background: A.bg,
            border: `1px solid ${A.bad}55`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: A.bad, fontSize: 9, letterSpacing: '0.14em' }}>SOLD_BACK</div>
              <div style={{ color: A.text, fontSize: 11, marginTop: 2 }}>$8,415 payout</div>
            </div>
            <div style={{ color: A.text, fontSize: 11 }}>+$7,165 net</div>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title="COMPS.SET">
        <table style={{ width: '100%', fontFamily: A.mono, fontSize: 10.5, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { n: 'shining_charizard_1ed', g: 'PSA10', f: '$14,800', p: '0 pulled' },
              { n: 'shining_gyarados_1ed',  g: 'PSA10', f: '$3,250',  p: '2 pulled' },
              { n: 'shining_steelix_1ed',   g: 'PSA10', f: '$1,640',  p: '1 pulled' },
              { n: 'shining_raichu_1ed',    g: 'PSA10', f: '$2,950',  p: '0 pulled' },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}` }}>
                <td style={{ padding: '6px 0', color: A.text }}>{r.n}</td>
                <td style={{ padding: '6px 0', color: A.text4, fontSize: 9, paddingLeft: 8 }}>{r.p}</td>
                <td style={{ padding: '6px 0', color: A.warn, textAlign: 'right' }}>{r.f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AsciiBox>

      <ACaveat lines={[
        'comps use MnStr FMV at last sighting. not market consensus.',
        'this card is sold back. last status: payout to player.',
      ]}/>
    </>
  );
}

Object.assign(window, { AWalletsScreen, AWalletDetail, ACardsScreen, ACardDetail });
