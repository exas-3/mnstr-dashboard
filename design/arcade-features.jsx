// MnStr · Arcade CRT — feature components
// Big-hit banner, identicon, search overlay, caveats sheet, embed preview,
// realised/paper toggle, sold-back chart, load-more, empty state.

// ─── Identicon — ASCII-style block grid ───
function AIdenticon({ addr = '0x0', size = 28 }) {
  const seed = (addr || '').replace(/^0x/, '').padEnd(40, '0').toLowerCase();
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const v = parseInt(seed[(r * 3 + c) % seed.length], 16);
      cells.push({ r, c, on: v > 7 });
    }
  }
  const px = size / 5;
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      background: A.bg, border: `1px solid ${A.text3}`,
      boxShadow: `inset 0 0 4px ${A.text}33`,
      flexShrink: 0,
    }}>
      {cells.map((cell, i) => cell.on && (
        <React.Fragment key={i}>
          <div style={{
            position: 'absolute', top: cell.r * px, left: cell.c * px,
            width: px, height: px, background: A.text,
          }}/>
          <div style={{
            position: 'absolute', top: cell.r * px, left: (4 - cell.c) * px,
            width: px, height: px, background: A.text,
          }}/>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Big-hit banner (Pulse) ───
function ABigHitBanner({ pull, onTap, onDismiss }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 900);
    return () => clearInterval(id);
  }, []);
  const flash = tick % 2 === 0;
  return (
    <div onClick={onTap} style={{
      margin: '12px 14px 0', padding: '10px 12px',
      border: `1px solid ${A.warn}`,
      background: `linear-gradient(90deg, ${A.warn}1a, transparent), ${A.bg2}`,
      boxShadow: flash ? `0 0 0 1px ${A.warn}, 0 0 28px ${A.warn}44` : `0 0 0 1px ${A.warn}55`,
      transition: 'box-shadow 240ms',
      cursor: 'pointer',
      fontFamily: A.mono,
    }}>
      <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.18em', textShadow: `0 0 6px ${A.warn}` }}>
        !! JACKPOT_DETECTED · {pull.ago} !!
      </div>
      <div style={{ marginTop: 5, color: A.text, fontSize: 12 }}>
        {pull.title}
      </div>
      <div style={{ marginTop: 3, color: A.text3, fontSize: 10, letterSpacing: '0.04em' }}>
        {pull.who} // {pull.tier} // <span style={{ color: A.warn }}>FMV ${pull.fmv}</span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); onTap && onTap(); }} style={{
          all: 'unset', cursor: 'pointer',
          padding: '3px 8px', border: `1px solid ${A.warn}`,
          color: A.warn, fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.12em',
        }}>[ENTER] INSPECT</button>
        <button onClick={(e) => { e.stopPropagation(); onDismiss && onDismiss(); }} style={{
          all: 'unset', cursor: 'pointer',
          padding: '3px 8px', border: `1px solid ${A.text4}`,
          color: A.text3, fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.12em',
        }}>[ESC] DISMISS</button>
      </div>
    </div>
  );
}

// ─── Realised / paper toggle (Tiers) ───
function ARpToggle({ value, onChange }) {
  return (
    <div style={{
      margin: '12px 14px 0', padding: '10px 12px',
      border: `1px solid ${A.text4}`, background: A.bg2,
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: A.mono,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: A.text3, fontSize: 9, letterSpacing: '0.16em' }}>PNL.MODE</div>
        <div style={{ color: A.text2, fontSize: 10.5, marginTop: 2 }}>
          {value === 'realised' ? '// counts sold-back only' : '// assumes immediate sell of all holdings'}
        </div>
      </div>
      <div style={{ display: 'flex', border: `1px solid ${A.text3}` }}>
        {['realised', 'paper'].map((o, i) => {
          const on = o === value;
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '4px 8px',
              background: on ? A.warn + '22' : 'transparent',
              color: on ? A.warn : A.text3,
              borderRight: i === 0 ? `1px solid ${A.text3}` : 'none',
              fontFamily: A.mono, fontSize: 9.5, letterSpacing: '0.08em',
            }}>{o.toUpperCase()}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sold-back rate over time (ASCII line) ───
function ASoldBackChart({ tier = 'Premium' }) {
  const series = {
    Starter: [42, 48, 51, 50, 55, 58, 62, 64, 63, 61, 60, 64],
    Premium: [58, 56, 60, 62, 59, 63, 65, 64, 62, 60, 61, 61],
    Ultra:   [70, 65, 64, 60, 58, 56, 54, 52, 53, 54, 53, 53],
  }[tier];
  const max = 100;
  const w = 340, h = 80;
  const dx = w / (series.length - 1);
  const points = series.map((v, i) => [i * dx, h - (v / max) * h]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  return (
    <AsciiBox title={`SOLD_BACK.TREND.${tier.toUpperCase()}`}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontFamily: A.mono }}>
        <span style={{ color: A.text3, fontSize: 9, letterSpacing: '0.12em' }}>12 MO · % SOLD-BACK</span>
        <span style={{ color: A.warn, fontSize: 12 }}>{last}%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 80, marginTop: 8, display: 'block' }}>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={h - (y / 100) * h} x2={w} y2={h - (y / 100) * h}
                stroke={A.text4} strokeDasharray="2 3" opacity="0.5"/>
        ))}
        <path d={`${path} L ${w},${h} L 0,${h} Z`} fill={A.text} opacity="0.12"/>
        <path d={path} fill="none" stroke={A.text} strokeWidth="1.4"/>
        {points.map(([x, y], i) => (
          <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" fill={i === points.length - 1 ? A.warn : A.text}/>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: A.text4, fontSize: 9, marginTop: 4 }}>
        <span>MAY '25</span><span>NOW</span>
      </div>
    </AsciiBox>
  );
}

// ─── Wallet search bar ───
function AWalletSearch({ value, onChange, count }) {
  return (
    <div style={{
      margin: '12px 14px 0',
      border: `1px solid ${A.text3}`, background: A.bg2,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      fontFamily: A.mono,
    }}>
      <span style={{ color: A.text }}>{'>'}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="grep handle | 0x…"
        style={{ all: 'unset', flex: 1, fontFamily: A.mono, fontSize: 12, color: A.text }}/>
      <span style={{ color: A.text4, fontSize: 9.5 }}>n={count}</span>
    </div>
  );
}

function ACardSearch({ value, onChange, count }) {
  return (
    <div style={{
      margin: '12px 14px 0',
      border: `1px solid ${A.text3}`, background: A.bg2,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      fontFamily: A.mono,
    }}>
      <span style={{ color: A.text }}>{'>'}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="grep title | set | cert…"
        style={{ all: 'unset', flex: 1, fontFamily: A.mono, fontSize: 12, color: A.text }}/>
      <span style={{ color: A.text4, fontSize: 9.5 }}>n={count}</span>
    </div>
  );
}

// ─── Load more / empty ───
function ALoadMore({ remaining, onLoad }) {
  if (remaining <= 0) return null;
  return (
    <div style={{ padding: '16px 14px 4px', textAlign: 'center' }}>
      <button onClick={onLoad} style={{
        all: 'unset', cursor: 'pointer',
        padding: '8px 14px',
        border: `1px solid ${A.text}`,
        color: A.text, fontFamily: A.mono, fontSize: 10, letterSpacing: '0.14em',
        background: A.text + '11',
      }}>[ ▼ ] LOAD_MORE · n={remaining.toLocaleString()}</button>
    </div>
  );
}

function AEmpty({ title = 'NO_RESULTS', sub = '// try a different query' }) {
  return (
    <div style={{
      margin: '14px 14px',
      padding: '24px 16px',
      border: `1px dashed ${A.text3}`,
      background: A.bg2,
      textAlign: 'center', fontFamily: A.mono,
    }}>
      <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.2em' }}>!! {title} !!</div>
      <div style={{ color: A.text3, marginTop: 6, fontSize: 11 }}>{sub}</div>
    </div>
  );
}

// ─── Search overlay ───
function ASearchOverlay({ open, onClose, onNavigate }) {
  const [q, setQ] = React.useState('');
  React.useEffect(() => { if (!open) setQ(''); }, [open]);
  if (!open) return null;

  const wallets = [
    { handle: 'phantasmagore', addr: '0xa1b2c3a8…02f3', sub: 'rank 01 · 218 pulls' },
    { handle: 'kage',          addr: '0x3c34d157…150e', sub: 'rank 02 · 412 pulls' },
    { handle: 'yumi',          addr: '0x8a3a99f8…42de', sub: 'rank 03 · 98 pulls' },
    { handle: 'aether',        addr: '0x9e0d3b21…04bd', sub: 'rank 05 · 52 pulls' },
  ];
  const cards = [
    { title: 'SHINING_CELEBI_1ED_106',     set: 'NEO_DESTINY · 2002', sub: 'PSA10 · n=1' },
    { title: 'CHARIZARD_BASE_HOLO',        set: 'BASE_SET · 1999',    sub: 'PSA10 · n=1' },
    { title: 'SPRIGATITO_MCDONALDS_017',   set: 'JPN_M-P_PROMO',      sub: 'PSA10 · n=4' },
    { title: 'LUGIA_NEO_GENESIS_1ED',      set: 'NEO_GENESIS · 2000', sub: 'PSA10 · n=1' },
  ];

  const ql = q.trim().toLowerCase();
  const matchedW = !ql ? wallets : wallets.filter(w => w.handle.includes(ql) || w.addr.toLowerCase().includes(ql));
  const matchedC = !ql ? cards   : cards.filter(c => c.title.toLowerCase().includes(ql) || c.set.toLowerCase().includes(ql));

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'oklch(0.09 0 0 / 0.96)',
      backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
      fontFamily: A.mono,
      animation: 'arc-fadein 180ms ease-out both',
    }}>
      <div style={{ paddingTop: 54, padding: '54px 14px 0' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: 10,
          background: A.bg2, border: `1px solid ${A.text}`,
          boxShadow: `0 0 12px ${A.text}33`,
        }}>
          <span style={{ color: A.text }}>{'>'}</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="grep _.*"
            style={{ all: 'unset', flex: 1, fontFamily: A.mono, fontSize: 14, color: A.text }}/>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: A.mono, fontSize: 10, color: A.text3, letterSpacing: '0.14em',
            padding: '3px 8px', border: `1px solid ${A.text3}`,
          }}>[ESC]</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 32px' }}>
        {!ql && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: A.text3, fontSize: 10, letterSpacing: '0.16em' }}>// SUGGESTIONS</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['phantasmagore', 'kage', '0xa1b2', 'celebi', 'charizard', 'cert6392'].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '4px 8px', border: `1px solid ${A.text4}`,
                  color: A.text3, fontFamily: A.mono, fontSize: 10,
                  background: A.bg2,
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ color: A.text2, fontSize: 10, letterSpacing: '0.12em' }}>// WALLETS · n={matchedW.length}</div>
        {matchedW.length === 0 ? <AEmpty title="NO_WALLETS"/> : (
          <div style={{ marginTop: 6, background: A.bg2, border: `1px solid ${A.text3}` }}>
            {matchedW.map((w, i) => (
              <button key={i} onClick={() => onNavigate('wallet')} style={{
                all: 'unset', cursor: 'pointer', display: 'grid', width: '100%',
                gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center',
                padding: '8px 10px',
                borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              }}>
                <AIdenticon addr={w.addr.replace(/[…]/g, 'f')} size={22}/>
                <div>
                  <div style={{ color: A.text, fontSize: 12 }}>{w.handle}</div>
                  <div style={{ color: A.text4, fontSize: 9.5, marginTop: 2 }}>{w.addr} :: {w.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, color: A.text2, fontSize: 10, letterSpacing: '0.12em' }}>// CARDS · n={matchedC.length}</div>
        {matchedC.length === 0 ? <AEmpty title="NO_CARDS"/> : (
          <div style={{ marginTop: 6, background: A.bg2, border: `1px solid ${A.text3}` }}>
            {matchedC.map((c, i) => (
              <button key={i} onClick={() => onNavigate('card')} style={{
                all: 'unset', cursor: 'pointer', display: 'grid', width: '100%',
                gridTemplateColumns: '30px 1fr', gap: 10, alignItems: 'center',
                padding: '8px 10px',
                borderTop: i === 0 ? 'none' : `1px dashed ${A.text4}`,
              }}>
                <div style={{
                  aspectRatio: '5/7',
                  background: `repeating-linear-gradient(45deg, ${A.bg3} 0 3px, transparent 3px 6px), ${A.bg2}`,
                  border: `1px solid ${A.text3}`,
                }}/>
                <div>
                  <div style={{ color: A.text, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ color: A.text4, fontSize: 9.5, marginTop: 2 }}>{c.set} :: {c.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Caveats sheet ───
function ACaveatSheet({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 90,
        background: 'oklch(0.09 0 0 / 0.78)', backdropFilter: 'blur(6px)',
        animation: 'arc-fadein 180ms ease-out both',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91,
        background: A.bg2, borderTop: `1px solid ${A.text}`,
        boxShadow: `0 -16px 40px oklch(0.09 0 0 / 0.9), 0 -1px 0 ${A.text}55`,
        paddingBottom: 40, maxHeight: '78%', overflowY: 'auto',
        animation: 'arc-slideup 200ms ease-out both',
        fontFamily: A.mono,
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: `1px dashed ${A.text3}`,
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ color: A.text, fontSize: 11, letterSpacing: '0.18em' }}>// README · CAVEATS</span>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', marginLeft: 'auto',
            padding: '3px 8px', border: `1px solid ${A.text3}`,
            color: A.text3, fontSize: 10, letterSpacing: '0.14em',
          }}>[ESC]</button>
        </div>
        <div style={{ padding: '8px 14px 20px', color: A.text2, fontSize: 12, lineHeight: 1.55 }}>
          {[
            ['MNSTR_FMV',  "vault's appraisal at moment of pull. not market consensus."],
            ['PHYSICAL',   "PSA-graded slabs in MnStr's insured vault. chain stores receipt + playId."],
            ['STATUS',     "'holding' may become 'sold_back' on next poll. re-evaluated periodically."],
            ['ODDS',       "per-pack odds are not derived. tier claims from mnstr.xyz/packs."],
            ['NET_PNL',    "spend − sold-back payouts − unrealised vault FMV of holdings."],
            ['HOUSE_EDGE', "Σ price − Σ FMV, weighted by sold/holding. 'realised' excludes holdings."],
          ].map(([k, body]) => (
            <div key={k} style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${A.text4}` }}>
              <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.14em' }}>{k}</div>
              <div style={{ marginTop: 4 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Live embed preview ───
function ALiveEmbedPreview({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 90,
        background: 'oklch(0.09 0 0 / 0.87)', backdropFilter: 'blur(8px)',
        animation: 'arc-fadein 180ms ease-out both',
      }}/>
      <div style={{
        position: 'absolute', left: 14, right: 14, top: 80, bottom: 110, zIndex: 91,
        background: A.bg2, border: `1px solid ${A.warn}`,
        boxShadow: `0 0 24px ${A.warn}33, inset 0 0 24px ${A.bg}`,
        display: 'flex', flexDirection: 'column',
        animation: 'arc-fadein 200ms ease-out both',
        fontFamily: A.mono,
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${A.warn}55`,
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ color: A.warn, fontSize: 10, letterSpacing: '0.2em' }}>// EMBED.PREVIEW</span>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', marginLeft: 'auto',
            padding: '3px 8px', border: `1px solid ${A.text3}`,
            color: A.text3, fontSize: 10, letterSpacing: '0.14em',
          }}>[ESC]</button>
        </div>
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            border: `1px dashed ${A.text3}`,
            padding: 8,
            display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10,
          }}>
            <ACardSlot fmv="8,415" psa="PSA10" hot/>
            <div>
              <div style={{ color: A.warn, fontSize: 10, letterSpacing: '0.14em' }}>● LIVE · ULTRA</div>
              <div style={{ color: A.text, fontSize: 13, marginTop: 4 }}>SHINING_CELEBI_1ED_106</div>
              <div style={{ color: A.text3, fontSize: 10, marginTop: 3 }}>@phantasmagore · SOLD $8,415</div>
            </div>
          </div>
          <div style={{ color: A.text4, fontSize: 9.5 }}>// STREAM_SAFE :: NO_CHROME :: CHROMA_KEY_OK</div>
          <div style={{
            marginTop: 'auto',
            background: A.bg, border: `1px solid ${A.text3}`,
            padding: 10,
          }}>
            <div style={{ color: A.text3, fontSize: 9.5, letterSpacing: '0.14em' }}>// EMBED.URL</div>
            <div style={{ color: A.warn, fontSize: 11, marginTop: 4, wordBreak: 'break-all' }}>
              mnstr-stats.xyz/live?embed=1&theme=dark
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['?embed=1', '&theme=light', '&minFMV=1000', '&tier=ultra'].map(p => (
                <span key={p} style={{
                  padding: '2px 6px', border: `1px solid ${A.text4}`, background: A.bg2,
                  color: A.text3, fontSize: 9.5,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CSS injection (arcade animations) ───
(function injectArcFx() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('arc-fx')) return;
  const s = document.createElement('style');
  s.id = 'arc-fx';
  s.textContent = '@keyframes arc-fadein { 0%{opacity:0} 100%{opacity:1} } @keyframes arc-slideup { 0%{transform:translateY(100%);opacity:0} 100%{transform:translateY(0);opacity:1} }';
  document.head.appendChild(s);
})();

Object.assign(window, {
  AIdenticon, ABigHitBanner, ARpToggle, ASoldBackChart,
  AWalletSearch, ACardSearch, ALoadMore, AEmpty,
  ASearchOverlay, ACaveatSheet, ALiveEmbedPreview,
});
