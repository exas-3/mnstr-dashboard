// MnStr · Arcade CRT — Live screen + orchestrator (AAppScreen)

// ════════════════════════════════════════════════════════════════
// LIVE
// ════════════════════════════════════════════════════════════════
function ALiveScreen() {
  const [tick, setTick] = React.useState(0);
  const [embedOpen, setEmbedOpen] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, []);
  const flash = tick % 6 === 0;
  const sec = 17 + (tick % 40);

  return (
    <>
      {/* Stream status */}
      <div style={{
        margin: '12px 14px 0', padding: '10px 12px',
        background: A.bg2, border: `1px solid ${A.text}`,
        boxShadow: `0 0 0 1px ${A.text}33, inset 0 0 16px ${A.text}11`,
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: A.mono,
      }}>
        <span style={{
          width: 8, height: 8, background: A.text,
          boxShadow: `0 0 8px ${A.text}`,
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{ color: A.text, fontSize: 11, letterSpacing: '0.18em', textShadow: `0 0 6px ${A.text}66` }}>● STREAM.LIVE</div>
          <div style={{ color: A.text4, fontSize: 9.5, marginTop: 2 }}>poll T+5s :: 18:42:{sec} UTC :: chain megaeth</div>
        </div>
        <button onClick={() => setEmbedOpen(true)} style={{
          all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap',
          padding: '4px 8px', border: `1px solid ${A.warn}`, background: A.warn + '11',
          color: A.warn, fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.1em',
        }}>?EMBED=1</button>
      </div>

      {/* 1H window */}
      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        <AKpi label="PKS.1H"  value="38"     delta="+3"/>
        <AKpi label="USDM"    value="$14.8K"/>
        <AKpi label="PAID"    value="$8.9K"/>
        <AKpi label="HITS"    value="2"      delta="amber"/>
      </div>

      {/* Big hit hero */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{
          background: A.bg2,
          border: `1px solid ${flash ? A.warn : A.text3}`,
          boxShadow: flash ? `0 0 0 1px ${A.warn}66, 0 0 24px ${A.warn}33` : `0 0 0 1px ${A.text3}55`,
          transition: 'box-shadow 220ms, border-color 220ms',
          display: 'grid', gridTemplateColumns: '110px 1fr',
          gap: 12, padding: 10,
          fontFamily: A.mono,
        }}>
          <ACardSlot fmv="8,415" psa="PSA10" hot/>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.18em' }}>● NOW · T-{tick % 20}s</div>
              <div style={{ color: A.text, fontSize: 13, marginTop: 6 }}>SHINING_CELEBI_1ED_106</div>
              <div style={{ color: A.text4, fontSize: 10, marginTop: 4 }}>neo_destiny · 2002</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: A.text, fontSize: 11 }}>@phantasmagore</span>
                <ATier tier="Ultra"/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                <AStatus status="sold_back"/>
                <span style={{ color: A.warn, fontSize: 13 }}>+$8,415</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stream grid */}
      <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { fmv: '312', who: '@kage',          tier: 'Premium', psa: 'PSA10', status: 'holding',   ago: 'T-42s' },
          { fmv: '35',  who: '0x7c…91a4',     tier: 'Starter', psa: 'PSA9',  status: 'holding',   ago: 'T-1m' },
          { fmv: '29',  who: '@yumi',          tier: 'Starter', psa: 'PSA10', status: 'sold_back', ago: 'T-2m' },
          { fmv: '212', who: '@aether',        tier: 'Premium', psa: 'PSA10', status: 'sold_back', ago: 'T-3m' },
          { fmv: '42',  who: '0xbb…aa10',     tier: 'Starter', psa: 'PSA9',  status: 'sold_back', ago: 'T-4m' },
          { fmv: '184', who: '@solo',          tier: 'Premium', psa: 'PSA10', status: 'holding',   ago: 'T-6m' },
        ].map((it, i) => (
          <div key={i} style={{
            background: A.bg2, border: `1px solid ${A.text4}`,
            padding: 7, display: 'flex', flexDirection: 'column', gap: 5,
            fontFamily: A.mono,
          }}>
            <ACardSlot fmv={it.fmv} psa={it.psa}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: A.text, fontSize: 10 }}>{it.who}</span>
              <span style={{ color: A.text4, fontSize: 8.5 }}>{it.ago}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <ATier tier={it.tier}/>
              <AStatus status={it.status}/>
            </div>
          </div>
        ))}
      </div>

      <ACaveat lines={[
        <span key="1"><button onClick={() => setEmbedOpen(true)} style={{ all: 'unset', cursor: 'pointer', color: A.warn }}>?embed=1</button> hides chrome for streamers.</span>,
        'big hits (≥$1k FMV) flash & pin for 30s.',
      ]}/>

      <ALiveEmbedPreview open={embedOpen} onClose={() => setEmbedOpen(false)}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// AAppScreen — orchestrator
// ════════════════════════════════════════════════════════════════
function AAppScreen({ start = 'pulse' }) {
  const [route, setRoute] = React.useState(start);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [caveatOpen, setCaveatOpen] = React.useState(false);

  const TITLES = {
    pulse:   { title: 'PULSE',     sub: '> GLOBAL :: 24H VIEW' },
    tiers:   { title: 'TIERS',     sub: '> PACK ECONOMICS' },
    wallets: { title: 'WALLETS',   sub: '> n=1,238 WALLETS' },
    wallet:  { title: 'WLT.DTL',   sub: '> @phantasmagore // RANK 01' },
    cards:   { title: 'CARDS',     sub: '> n=2,184 IN VAULT' },
    card:    { title: 'CRD.DTL',   sub: '> NEO_DESTINY // 2002' },
    live:    { title: 'LIVE',      sub: '> POLL T+5s // STREAMING' },
  };
  const activeTab = ({ wallet: 'wallets', card: 'cards' })[route] || route;

  const body = (() => {
    switch (route) {
      case 'pulse':   return <APulseScreen onOpenCard={() => setRoute('card')} onOpenLive={() => setRoute('live')}/>;
      case 'tiers':   return <ATiersScreen onOpenCard={() => setRoute('card')}/>;
      case 'wallets': return <AWalletsScreen onOpenWallet={() => setRoute('wallet')}/>;
      case 'wallet':  return <AWalletDetail onBack={() => setRoute('wallets')}/>;
      case 'cards':   return <ACardsScreen onOpenCard={() => setRoute('card')}/>;
      case 'card':    return <ACardDetail onBack={() => setRoute('cards')}/>;
      case 'live':    return <ALiveScreen/>;
      default:        return null;
    }
  })();

  const meta = TITLES[route];

  const handleNavigateFromSearch = (target) => {
    setSearchOpen(false);
    setRoute(target);
  };

  return (
    <AShell
      active={activeTab}
      onNav={(id) => { setSearchOpen(false); setRoute(id); }}
      title={meta.title} sub={meta.sub}
      onSearch={() => setSearchOpen(true)}
      onInfo={() => setCaveatOpen(true)}
      overlay={
        <>
          <ASearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleNavigateFromSearch}/>
          <ACaveatSheet open={caveatOpen} onClose={() => setCaveatOpen(false)}/>
        </>
      }
    >
      {body}
    </AShell>
  );
}

Object.assign(window, { ALiveScreen, AAppScreen });
