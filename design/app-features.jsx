// MnStr — extended feature components
// Adds: search overlay, caveat sheet, time pivot, big-hit banner,
// identicons, embed-mode preview, sold-back-rate chart, realised/paper
// toggle, load-more pagination, empty states, wallet timeline + neighbours.
//
// Relies on globals from screens.jsx: P, Mono, Lbl, TierTag, StatusPill,
// CardSlot, Sparkline.

// ─────────────────────────────────────────────────────────────
// Identicon — deterministic 5x5 mirrored grid from addr hex
// ─────────────────────────────────────────────────────────────
function Identicon({ addr = '0x000000', size = 28, palette }) {
  const seed = (addr || '').replace(/^0x/, '').padEnd(40, '0').toLowerCase();
  const pal = palette || [
    P.amber, P.mag, P.mint, P.blue,
    'oklch(0.78 0.16 35)',
    'oklch(0.78 0.14 195)',
  ];
  const colA = pal[parseInt(seed.slice(0, 1), 16) % pal.length];
  const colB = pal[parseInt(seed.slice(2, 3), 16) % pal.length];
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const bit = parseInt(seed[(r * 3 + c) % seed.length], 16) & 1;
      const filled = parseInt(seed[(r * 3 + c + 7) % seed.length], 16) > 7;
      cells.push({ r, c, filled, alt: bit });
    }
  }
  const px = size / 5;
  return (
    <div style={{
      position: 'relative', width: size, height: size,
      background: P.bg3, border: `1px solid ${P.line}`,
      overflow: 'hidden', flexShrink: 0,
    }}>
      {cells.map((cell, i) => {
        if (!cell.filled) return null;
        return (
          <React.Fragment key={i}>
            <div style={{
              position: 'absolute', top: cell.r * px, left: cell.c * px,
              width: px, height: px,
              background: cell.alt ? colA : colB,
            }}/>
            <div style={{
              position: 'absolute', top: cell.r * px, left: (4 - cell.c) * px,
              width: px, height: px,
              background: cell.alt ? colA : colB,
            }}/>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon button — small top-bar action
// ─────────────────────────────────────────────────────────────
function IconBtn({ icon, onClick, ariaLabel, active }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} style={{
      all: 'unset', cursor: 'pointer',
      width: 28, height: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${active ? P.amber + '99' : P.line}`,
      background: active ? P.amber + '15' : P.bg2,
    }}>{icon}</button>
  );
}

const SearchIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6" stroke={P.fg2} strokeWidth="1.6"/>
    <line x1="15" y1="15" x2="20" y2="20" stroke={P.fg2} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const InfoIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={P.fg2} strokeWidth="1.4"/>
    <line x1="12" y1="11" x2="12" y2="17" stroke={P.fg2} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="12" cy="7.5" r="1" fill={P.fg2}/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Time pivot
// ─────────────────────────────────────────────────────────────
function TimePivot({ value, onChange, options = ['24H', '7D', '30D', 'ALL'] }) {
  return (
    <div style={{
      display: 'inline-flex', border: `1px solid ${P.lineSoft}`,
      background: P.bg2,
    }}>
      {options.map((o, i) => {
        const on = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '5px 10px',
            background: on ? P.bg3 : 'transparent',
            borderRight: i === options.length - 1 ? 'none' : `1px solid ${P.lineSoft}`,
            fontFamily: P.mono, fontSize: 9.5, letterSpacing: '0.1em',
            color: on ? P.amber : P.fg3,
          }}>{o}</button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Big-hit banner
// ─────────────────────────────────────────────────────────────
function BigHitBanner({ pull, onTap, onDismiss }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1100);
    return () => clearInterval(id);
  }, []);
  const flash = tick % 2 === 0;
  return (
    <div onClick={onTap} style={{
      margin: '12px 12px 0',
      position: 'relative',
      border: `1px solid ${flash ? P.amber : P.amber + '88'}`,
      background: `linear-gradient(90deg, ${P.amber}1a, transparent 70%), ${P.bg2}`,
      boxShadow: flash ? `0 0 0 1px ${P.amber}66, 0 0 28px ${P.amber}33` : `0 0 0 1px ${P.amber}22`,
      transition: 'box-shadow 300ms, border-color 300ms',
      display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 12,
      padding: 10, alignItems: 'center', cursor: 'pointer',
    }}>
      <div style={{
        aspectRatio: '5/7',
        background: `
          radial-gradient(circle at 30% 20%, ${P.amber}44, transparent 55%),
          repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)
        `,
        border: `1px solid ${P.amber}88`,
      }}/>
      <div style={{ minWidth: 0 }}>
        <Mono style={{ fontSize: 9, color: P.amber, letterSpacing: '0.18em' }}>★ BIG HIT · {pull.ago}</Mono>
        <div style={{ fontFamily: P.sans, fontSize: 13, color: P.fg, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pull.title}</div>
        <Mono style={{ fontSize: 10, color: P.fg3, marginTop: 2, display: 'block' }}>{pull.who} · {pull.tier}</Mono>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono style={{ fontSize: 17, color: P.amber, display: 'block' }}>${pull.fmv}</Mono>
        <button onClick={(e) => { e.stopPropagation(); onDismiss && onDismiss(); }}
          style={{ all: 'unset', cursor: 'pointer', marginTop: 2, fontFamily: P.mono, fontSize: 9, color: P.fg4, letterSpacing: '0.1em' }}>
          DISMISS
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Realised / paper toggle
// ─────────────────────────────────────────────────────────────
function RealisedPaperToggle({ value, onChange }) {
  return (
    <div style={{
      margin: '14px 12px 0',
      background: P.bg2, border: `1px solid ${P.lineSoft}`,
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <Lbl style={{ fontSize: 9, letterSpacing: '0.14em' }}>P&amp;L MODE</Lbl>
        <div style={{ fontFamily: P.sans, fontSize: 12, color: P.fg3, marginTop: 2 }}>
          {value === 'realised' ? 'Counts only sold-back pulls.' : 'Assumes everyone sells at current FMV.'}
        </div>
      </div>
      <div style={{ display: 'flex', border: `1px solid ${P.line}` }}>
        {['realised', 'paper'].map((o, i) => {
          const on = o === value;
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '6px 10px',
              background: on ? P.amber + '18' : 'transparent',
              borderRight: i === 0 ? `1px solid ${P.line}` : 'none',
              color: on ? P.amber : P.fg3,
              fontFamily: P.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sold-back rate over time
// ─────────────────────────────────────────────────────────────
function SoldBackChart({ tier = 'Premium' }) {
  const series = {
    Starter: [42, 48, 51, 50, 55, 58, 62, 64, 63, 61, 60, 64],
    Premium: [58, 56, 60, 62, 59, 63, 65, 64, 62, 60, 61, 61],
    Ultra:   [70, 65, 64, 60, 58, 56, 54, 52, 53, 54, 53, 53],
  }[tier];
  const w = 360, h = 130;
  const dx = w / (series.length - 1);
  const points = series.map((v, i) => [i * dx, h - (v / 100) * h]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fill = `${path} L ${w},${h} L 0,${h} Z`;
  const last = series[series.length - 1];
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
      <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'baseline' }}>
        <Lbl>Sold-back rate · 12mo</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 11, color: P.amber }}>{last}%</Mono>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
        <defs>
          <linearGradient id={`sb-${tier}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={P.amber} stopOpacity="0.35"/>
            <stop offset="1" stopColor={P.amber} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={h - (y / 100) * h} x2={w} y2={h - (y / 100) * h}
                stroke={P.lineSoft} strokeDasharray="2 4"/>
        ))}
        <path d={fill} fill={`url(#sb-${tier})`}/>
        <path d={path} fill="none" stroke={P.amber} strokeWidth="1.4"/>
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3 : 1.5} fill={P.amber}/>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 10px' }}>
        <Mono style={{ fontSize: 9, color: P.fg4 }}>MAY '25</Mono>
        <Mono style={{ fontSize: 9, color: P.fg4 }}>NOW</Mono>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Search bars
// ─────────────────────────────────────────────────────────────
function WalletSearchBar({ value, onChange, count }) {
  return (
    <div style={{
      margin: '12px 12px 0',
      background: P.bg2, border: `1px solid ${P.lineSoft}`,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px',
    }}>
      <span style={{ display: 'flex' }}>{SearchIcon}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Search handle or 0x…"
        style={{
          all: 'unset', flex: 1,
          fontFamily: P.mono, fontSize: 12, color: P.fg,
        }}/>
      <Mono style={{ fontSize: 10, color: P.fg4 }}>{count.toLocaleString()}</Mono>
    </div>
  );
}

function CardSearchBar({ value, onChange, count }) {
  return (
    <div style={{
      margin: '12px 12px 0',
      background: P.bg2, border: `1px solid ${P.lineSoft}`,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px',
    }}>
      <span style={{ display: 'flex' }}>{SearchIcon}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Title, set, character, cert…"
        style={{
          all: 'unset', flex: 1,
          fontFamily: P.mono, fontSize: 12, color: P.fg,
        }}/>
      <Mono style={{ fontSize: 10, color: P.fg4 }}>{count.toLocaleString()}</Mono>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Load more & empty state
// ─────────────────────────────────────────────────────────────
function LoadMore({ remaining, onLoad }) {
  if (remaining <= 0) return null;
  return (
    <div style={{ padding: '20px 16px 8px', textAlign: 'center' }}>
      <button onClick={onLoad} style={{
        all: 'unset', cursor: 'pointer',
        fontFamily: P.mono, fontSize: 10.5, letterSpacing: '0.14em',
        padding: '10px 18px', color: P.amber,
        border: `1px solid ${P.amber}55`, background: P.amber + '0d',
      }}>LOAD MORE · {remaining.toLocaleString()} LEFT</button>
    </div>
  );
}

function EmptyState({ title = 'NO RESULTS', sub = 'Try a different query.' }) {
  return (
    <div style={{
      margin: '14px 12px',
      padding: '32px 16px',
      border: `1px dashed ${P.line}`,
      background: P.bg2,
      textAlign: 'center',
    }}>
      <Mono style={{ fontSize: 10, color: P.amber, letterSpacing: '0.2em', display: 'block' }}>{title}</Mono>
      <div style={{ fontFamily: P.sans, fontSize: 13, color: P.fg3, marginTop: 8 }}>{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Search overlay
// ─────────────────────────────────────────────────────────────
function SearchOverlay({ open, onClose, onNavigate }) {
  const [q, setQ] = React.useState('');
  React.useEffect(() => { if (!open) setQ(''); }, [open]);
  if (!open) return null;

  const wallets = [
    { handle: 'phantasmagore', addr: '0xa1b2c3a8…02f3', sub: '218 pulls · #1' },
    { handle: 'kage',          addr: '0x3c34d157…150e', sub: '412 pulls · #2' },
    { handle: 'yumi',          addr: '0x8a3a99f8…42de', sub: '98 pulls · #3' },
    { handle: 'aether',        addr: '0x9e0d3b21…04bd', sub: '52 pulls · #5' },
  ];
  const cards = [
    { title: 'Shining Celebi 1ed #106',   set: 'Neo Destiny · 2002', sub: 'PSA 10 · 1 pulled' },
    { title: 'Charizard Base Set Holo',   set: 'Base Set · 1999',    sub: 'PSA 10 · 1 pulled' },
    { title: 'Sprigatito McDonald\'s #017', set: 'JPN M-P Promo',     sub: 'PSA 10 · 4 pulled' },
    { title: 'Lugia Neo Genesis 1ed',     set: 'Neo Genesis · 2000', sub: 'PSA 10 · 1 pulled' },
  ];

  const ql = q.trim().toLowerCase();
  const matchedW = !ql ? wallets : wallets.filter(w => w.handle.includes(ql) || w.addr.toLowerCase().includes(ql));
  const matchedC = !ql ? cards   : cards.filter(c => c.title.toLowerCase().includes(ql) || c.set.toLowerCase().includes(ql));

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: `${P.bg}f5`, backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      animation: 'mnstr-fadein 180ms ease-out',
    }}>
      <div style={{ paddingTop: 54, padding: '54px 12px 0' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: 10,
          background: P.bg2, border: `1px solid ${P.amber}55`,
        }}>
          <span style={{ display: 'flex' }}>{SearchIcon}</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search wallets, cards, certs…"
            style={{
              all: 'unset', flex: 1,
              fontFamily: P.mono, fontSize: 14, color: P.fg,
            }}/>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: P.mono, fontSize: 10, color: P.fg3,
            letterSpacing: '0.14em', padding: '4px 8px',
            border: `1px solid ${P.line}`,
          }}>ESC</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 32px' }}>
        {!ql && (
          <div style={{ marginBottom: 16 }}>
            <Lbl>Try</Lbl>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['phantasmagore', '@kage', '0xa1b2', 'celebi', 'charizard', 'cert 6392'].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '5px 10px', border: `1px solid ${P.line}`,
                  background: P.bg2,
                  fontFamily: P.mono, fontSize: 10, color: P.fg3,
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <Lbl>Wallets · {matchedW.length}</Lbl>
        {matchedW.length === 0 ? <EmptyState title="NO WALLETS"/> : (
          <div style={{ marginTop: 8, background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
            {matchedW.map((w, i) => (
              <button key={i} onClick={() => onNavigate('wallet')} style={{
                all: 'unset', cursor: 'pointer', display: 'grid', width: '100%',
                gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center',
                padding: '10px 12px',
                borderTop: i === 0 ? 'none' : `1px dashed ${P.lineSoft}`,
              }}>
                <Identicon addr={w.addr.replace(/[…]/g, 'f')} size={26}/>
                <div>
                  <div style={{ fontFamily: P.sans, fontSize: 13, color: P.fg }}>{w.handle}</div>
                  <Mono style={{ fontSize: 10, color: P.fg3, display: 'block', marginTop: 2 }}>{w.addr} · {w.sub}</Mono>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Lbl>Cards · {matchedC.length}</Lbl>
          {matchedC.length === 0 ? <EmptyState title="NO CARDS"/> : (
            <div style={{ marginTop: 8, background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
              {matchedC.map((c, i) => (
                <button key={i} onClick={() => onNavigate('card')} style={{
                  all: 'unset', cursor: 'pointer', display: 'grid', width: '100%',
                  gridTemplateColumns: '34px 1fr', gap: 10, alignItems: 'center',
                  padding: '10px 12px',
                  borderTop: i === 0 ? 'none' : `1px dashed ${P.lineSoft}`,
                }}>
                  <div style={{
                    aspectRatio: '5/7',
                    background: 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
                    border: `1px solid ${P.line}`,
                  }}/>
                  <div>
                    <div style={{ fontFamily: P.sans, fontSize: 13, color: P.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                    <Mono style={{ fontSize: 10, color: P.fg3, display: 'block', marginTop: 2 }}>{c.set} · {c.sub}</Mono>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Caveat sheet
// ─────────────────────────────────────────────────────────────
function CaveatSheet({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 90,
        background: `${P.bg}aa`, backdropFilter: 'blur(6px)',
        animation: 'mnstr-fadein 180ms ease-out',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 91,
        background: P.bg2, borderTop: `1px solid ${P.amber}66`,
        boxShadow: `0 -20px 60px ${P.bg}cc`,
        paddingBottom: 40, maxHeight: '78%', overflowY: 'auto',
        animation: 'mnstr-slideup 200ms ease-out',
      }}>
        <div style={{ padding: '14px 16px 4px', display: 'flex', alignItems: 'baseline' }}>
          <Lbl style={{ color: P.amber }}>Caveats &amp; methodology</Lbl>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', marginLeft: 'auto',
            fontFamily: P.mono, fontSize: 10, color: P.fg3, letterSpacing: '0.14em',
            padding: '4px 8px', border: `1px solid ${P.line}`,
          }}>CLOSE</button>
        </div>
        <div style={{ padding: '6px 16px 20px', fontFamily: P.sans, fontSize: 13, color: P.fg2, lineHeight: 1.55 }}>
          {[
            ['MnStr FMV', "The value MnStr assigns each card at the moment of pull. Not market consensus; not an appraisal you can trade against elsewhere."],
            ['Cards are physical', "PSA-graded slabs held in MnStr's insured vault. The chain stores a payment receipt + a play ID — that's all."],
            ['Status can change', 'A "holding" pull today can become "sold-back" tomorrow. We re-poll holding pulls periodically.'],
            ['Pack odds', "We don't derive per-pack odds. Tier-level claims are MnStr's; see mnstr.xyz/packs."],
            ['Net P&L', 'Spend − sold-back payouts − unrealised vault FMV of held pulls. Revalues on every poll.'],
            ['House edge', 'Sum of price_usd − sum of fmv_usd, weighted by sold-back vs holding. "Realised" mode excludes holding pulls.'],
          ].map(([t, body]) => (
            <div key={t} style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${P.lineSoft}` }}>
              <Mono style={{ fontSize: 10, color: P.amber, letterSpacing: '0.14em', display: 'block' }}>{t}</Mono>
              <div style={{ marginTop: 4 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Live embed-mode preview
// ─────────────────────────────────────────────────────────────
function LiveEmbedPreview({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 90,
        background: `${P.bg}cc`, backdropFilter: 'blur(8px)',
        animation: 'mnstr-fadein 180ms ease-out',
      }}/>
      <div style={{
        position: 'absolute', left: 12, right: 12, top: 90, bottom: 110, zIndex: 91,
        background: P.bg2, border: `1px solid ${P.amber}66`,
        boxShadow: `0 0 60px ${P.bg}, 0 0 0 1px ${P.amber}22`,
        display: 'flex', flexDirection: 'column',
        animation: 'mnstr-fadein 200ms ease-out',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${P.lineSoft}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Mono style={{ fontSize: 9, color: P.amber, letterSpacing: '0.2em' }}>?EMBED=1 · PREVIEW</Mono>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', marginLeft: 'auto',
            fontFamily: P.mono, fontSize: 10, color: P.fg3, letterSpacing: '0.14em',
            padding: '4px 8px', border: `1px solid ${P.line}`,
          }}>CLOSE</button>
        </div>
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            border: `1px dashed ${P.line}`,
            padding: 8,
            display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10, alignItems: 'center',
          }}>
            <div style={{
              aspectRatio: '5/7',
              background: `
                radial-gradient(circle at 30% 20%, ${P.amber}44, transparent 55%),
                repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)
              `,
              border: `1px solid ${P.amber}88`,
            }}/>
            <div>
              <Mono style={{ fontSize: 9, color: P.amber, letterSpacing: '0.16em' }}>● LIVE · ULTRA</Mono>
              <div style={{ fontFamily: P.sans, fontSize: 14, color: P.fg, marginTop: 3 }}>Shining Celebi 1ed #106</div>
              <Mono style={{ fontSize: 10, color: P.fg3, display: 'block', marginTop: 3 }}>@phantasmagore · sold $8,415</Mono>
            </div>
          </div>
          <Mono style={{ fontSize: 9, color: P.fg4 }}>STREAM-SAFE · NO CHROME · CHROMA-KEY BG SUPPORTED</Mono>
          <div style={{
            marginTop: 'auto',
            background: P.bg, border: `1px solid ${P.lineSoft}`,
            padding: 10,
          }}>
            <Mono style={{ fontSize: 9.5, color: P.fg3, letterSpacing: '0.12em', display: 'block' }}>EMBED URL</Mono>
            <Mono style={{ fontSize: 11, color: P.amber, marginTop: 4, display: 'block', wordBreak: 'break-all' }}>
              mnstr-stats.xyz/live?embed=1&amp;theme=dark
            </Mono>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['?embed=1', '&theme=light', '&minFMV=1000', '&tier=ultra'].map(p => (
                <span key={p} style={{
                  padding: '3px 8px', border: `1px solid ${P.line}`, background: P.bg2,
                  fontFamily: P.mono, fontSize: 9.5, color: P.fg3,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Wallet detail extras
// ─────────────────────────────────────────────────────────────
function WalletPullsTimeline() {
  const weeks = [3, 5, 4, 7, 6, 9, 5, 12, 8, 6, 11, 14];
  const hits  = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  const max = Math.max(...weeks);
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}`, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <Lbl>Pull rhythm · 12wk</Lbl>
        <Mono style={{ marginLeft: 'auto', fontSize: 10, color: P.fg3 }}>{weeks.reduce((a,b)=>a+b,0)} pulls</Mono>
      </div>
      <svg viewBox="0 0 360 100" preserveAspectRatio="none" style={{ width: '100%', height: 90, marginTop: 8, display: 'block' }}>
        {weeks.map((v, i) => {
          const x = 6 + i * 28;
          const h = (v / max) * 70;
          return (
            <g key={i}>
              <rect x={x} y={90 - h} width="20" height={h} fill={P.amber} opacity={hits[i] ? 0.95 : 0.35}/>
              {hits[i] === 1 && (
                <text x={x + 10} y={90 - h - 6} fontFamily={P.mono} fontSize="10" fill={P.amber} textAnchor="middle">★</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <Mono style={{ fontSize: 9, color: P.fg4 }}>12W AGO</Mono>
        <Mono style={{ fontSize: 9, color: P.fg4 }}>NOW</Mono>
      </div>
    </div>
  );
}

function WalletNeighbours({ onOpenWallet }) {
  const list = [
    { rank: 1, h: 'phantasmagore', a: '0xa1…02f3', pnl: '+$48,210', pos: true, here: true },
    { rank: 2, h: 'kage',          a: '0x3c…150e', pnl: '+$18,200', pos: true },
    { rank: 3, h: 'yumi',          a: '0x8a…42de', pnl: '+$9,100',  pos: true },
    { rank: 4, h: null,            a: '0x7c…91a4', pnl: '−$12,100' },
  ];
  return (
    <div style={{ margin: '0 12px', background: P.bg2, border: `1px solid ${P.lineSoft}` }}>
      {list.map((n, i) => (
        <button key={i} onClick={() => !n.here && onOpenWallet && onOpenWallet()} style={{
          all: 'unset', cursor: n.here ? 'default' : 'pointer', display: 'grid', width: '100%',
          gridTemplateColumns: '28px 26px 1fr auto', gap: 10, alignItems: 'center',
          padding: '10px 12px',
          borderTop: i === 0 ? 'none' : `1px dashed ${P.lineSoft}`,
          background: n.here ? P.amber + '0e' : 'transparent',
        }}>
          <Mono style={{ fontSize: 11, color: n.here ? P.amber : P.fg4 }}>{String(n.rank).padStart(2, '0')}</Mono>
          <Identicon addr={n.a.replace(/[…]/g, 'f') + '00'} size={22}/>
          <div>
            <div style={{ fontFamily: P.sans, fontSize: 12, color: P.fg }}>
              {n.h || n.a} {n.here && <Mono style={{ fontSize: 8.5, color: P.amber, marginLeft: 4 }}>· YOU</Mono>}
            </div>
            {n.h && <Mono style={{ fontSize: 9.5, color: P.fg4, display: 'block', marginTop: 2 }}>{n.a}</Mono>}
          </div>
          <Mono style={{ fontSize: 11, color: n.pos ? P.mint : P.mag }}>{n.pnl}</Mono>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSS keyframes
// ─────────────────────────────────────────────────────────────
(function injectFx() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mnstr-fx')) return;
  const s = document.createElement('style');
  s.id = 'mnstr-fx';
  s.textContent = '@keyframes mnstr-fadein { 0%{opacity:0} 100%{opacity:1} } @keyframes mnstr-slideup { 0%{transform:translateY(100%);opacity:0} 100%{transform:translateY(0);opacity:1} }';
  document.head.appendChild(s);
})();

Object.assign(window, {
  Identicon, IconBtn, SearchIcon, InfoIcon,
  TimePivot, BigHitBanner,
  RealisedPaperToggle, SoldBackChart,
  WalletSearchBar, CardSearchBar,
  LoadMore, EmptyState,
  SearchOverlay, CaveatSheet, LiveEmbedPreview,
  WalletPullsTimeline, WalletNeighbours,
});
