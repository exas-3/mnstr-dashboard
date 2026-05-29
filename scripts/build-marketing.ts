/* Local-only marketing image generator. Hand-composed SVG → PNG via sharp
 * (same path as build-favicons.ts). Outputs to design/marketing/ which is
 * excluded from the deploy rsync, so nothing ships. Not for production use.
 *
 *   npx tsx scripts/build-marketing.ts
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'design', 'marketing');
mkdirSync(OUT, { recursive: true });

// Foil theme palette (oklch tokens → hex; librsvg doesn't grok oklch()).
const C = {
  bg: '#16130e',
  bg2: '#201c15',
  bg3: '#28231b',
  line: '#3a342a',
  fg: '#f4f0e8',
  fg2: '#c8c1b4',
  fg3: '#8b8275',
  fg4: '#5c554a',
  accent: '#d6a04a',
  accentDim: '#a87a30',
  magenta: '#d65a9e',
};
const MONO = "ui-monospace, 'DejaVu Sans Mono', monospace";
const SANS = "'DejaVu Sans', sans-serif";

const W = 1200, H = 675;

// Fresh prod numbers (2026-05-29).
const STATS = [
  { value: '38,909', label: 'PACKS PULLED' },
  { value: '1,091',  label: 'PLAYERS' },
  { value: '$3.5M',  label: 'USDm CYCLED' },
  { value: '$10,013', label: 'BIGGEST HIT' },
];

function esc(s: string) { return s.replace(/&/g, '&amp;'); }

/* ---------- Image 1: stat-card ---------- */
function statCard(): string {
  const cells = STATS.map((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cw = 470, ch = 150, gap = 40;
    const x = 90 + col * (cw + gap);
    const y = 230 + row * (ch + gap);
    return `
      <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="6"
            fill="${C.bg2}" stroke="${C.line}" stroke-width="1"/>
      <text x="${x + 28}" y="${y + 86}" font-family="${MONO}" font-size="62"
            font-weight="700" fill="${C.accent}">${esc(s.value)}</text>
      <text x="${x + 30}" y="${y + 122}" font-family="${MONO}" font-size="18"
            letter-spacing="4" fill="${C.fg3}">${esc(s.label)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect x="0" y="0" width="${W}" height="6" fill="${C.accent}"/>
    <text x="90" y="120" font-family="${MONO}" font-size="58" font-weight="700"
          letter-spacing="2" fill="${C.fg}">MN<tspan fill="${C.accent}">$</tspan>TR <tspan fill="${C.fg4}">·</tspan> WATCH</text>
    <text x="92" y="160" font-family="${MONO}" font-size="20" letter-spacing="3"
          fill="${C.fg3}">// live on-chain analytics for the MnStr gacha</text>
    ${cells}
    <text x="90" y="630" font-family="${SANS}" font-size="22" fill="${C.fg4}">
      Pokémon TCG &amp; One Piece · MegaETH</text>
    <text x="${W - 90}" y="630" text-anchor="end" font-family="${MONO}" font-size="30"
          font-weight="700" fill="${C.accent}">mnstr.watch</text>
  </svg>`;
}

/* ---------- Image 2: advertised vs actual buyback ---------- */
function buybackChart(): string {
  // Ordered by pack price ascending.
  const tiers = [
    { name: 'STARTER',   price: '$50',   rate: 87 },
    { name: 'ADVENTURE', price: '$150',  rate: 90 },
    { name: 'MONSTER',   price: '$250',  rate: 91 },
    { name: 'ULTRA',     price: '$1,250', rate: 95 },
  ];
  const X0 = 280, X1 = 1080, LO = 80, HI = 100;
  const xFor = (v: number) => X0 + ((v - LO) / (HI - LO)) * (X1 - X0);
  const advX = xFor(85);

  const rowH = 92, barH = 44, top = 235;
  const bars = tiers.map((t, i) => {
    const cy = top + i * rowH;
    const bx = xFor(t.rate);
    return `
      <text x="${X0 - 24}" y="${cy + barH / 2 + 7}" text-anchor="end"
            font-family="${MONO}" font-size="22" font-weight="700" fill="${C.fg}">${t.name}</text>
      <text x="${X0 - 24}" y="${cy + barH / 2 + 30}" text-anchor="end"
            font-family="${MONO}" font-size="14" fill="${C.fg4}">${t.price}</text>
      <rect x="${X0}" y="${cy}" width="${X1 - X0}" height="${barH}" rx="3" fill="${C.bg2}"/>
      <rect x="${X0}" y="${cy}" width="${bx - X0}" height="${barH}" rx="3" fill="${C.accent}"/>
      <text x="${bx + 16}" y="${cy + barH / 2 + 8}" font-family="${MONO}" font-size="26"
            font-weight="700" fill="${C.accent}">${t.rate}%</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect x="0" y="0" width="${W}" height="6" fill="${C.accent}"/>
    <text x="90" y="110" font-family="${SANS}" font-size="46" font-weight="700"
          fill="${C.fg}">Advertised vs. actual buyback</text>
    <text x="92" y="150" font-family="${MONO}" font-size="22" letter-spacing="1"
          fill="${C.fg3}">MnStr advertises 85%. On-chain payouts say more.</text>

    <!-- advertised 85% reference line -->
    <line x1="${advX}" y1="210" x2="${advX}" y2="${top + tiers.length * rowH - 18}"
          stroke="${C.magenta}" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="${advX}" y="200" text-anchor="middle" font-family="${MONO}" font-size="16"
          fill="${C.magenta}">advertised 85%</text>

    ${bars}

    <text x="90" y="635" font-family="${SANS}" font-size="20" fill="${C.fg4}">
      Real per-tier rates, verified against on-chain USDm payouts.</text>
    <text x="${W - 90}" y="635" text-anchor="end" font-family="${MONO}" font-size="26"
          font-weight="700" fill="${C.accent}">mnstr.watch</text>
  </svg>`;
}

async function main() {
  const jobs: Array<[string, string]> = [
    ['stat-card.png', statCard()],
    ['buyback-chart.png', buybackChart()],
  ];
  for (const [name, svg] of jobs) {
    await sharp(Buffer.from(svg)).png().toFile(join(OUT, name));
    console.log(`wrote ${join('design/marketing', name)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
