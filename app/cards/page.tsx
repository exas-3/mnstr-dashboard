import type { Metadata } from 'next';
import { getCardsList, getVaultStats, type CardView } from '@/lib/queries';
import { KpiTile, Mono, SectionHead, tierLabel } from '@/components/primitives';
import FilterChips from '@/components/cards/FilterChips';
import CardSearchBar from '@/components/cards/CardSearchBar';
import CardWallTile from '@/components/cards/CardWallTile';
import CardsLoadMore from '@/components/cards/CardsLoadMore';
import EmptyState from '@/components/EmptyState';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Cards · The vault',
  description:
    "Browse every card pulled from MnStr packs, filtered by tier and ranked by FMV or pull count. PSA-graded slabs held in MnStr's vault.",
  alternates: { canonical: '/cards' },
};

const PAGE_SIZE = 24;

const VIEW_CHIPS = [
  { id: 'top'  as const, label: 'Top hits'    },
  { id: 'most' as const, label: 'Most pulled' },
];
const TIER_CHIPS = [
  { id: 'all'     as const, label: 'All tiers' },
  { id: 'Starter' as const, label: 'Starter'   },
  { id: 'Premium' as const, label: 'Monster'   },
  { id: 'Ultra'   as const, label: 'Ultra'     },
];

type Tier = (typeof TIER_CHIPS)[number]['id'];

// `recent` is still a valid CardView in the data layer, but we don't expose
// it in the UI anymore. Stray ?view=recent URLs fall back to 'top'.
function isView(v: unknown): v is CardView {
  return v === 'top' || v === 'most';
}
function isTier(v: unknown): v is Tier {
  return v === 'all' || v === 'Starter' || v === 'Premium' || v === 'Ultra';
}

function buildHref(opts: { view: CardView; tier: Tier; q?: string; page?: number }): string {
  const p = new URLSearchParams();
  if (opts.view !== 'top') p.set('view', opts.view);
  if (opts.tier !== 'all') p.set('tier', opts.tier);
  if (opts.q) p.set('q', opts.q);
  if (opts.page) p.set('page', String(opts.page));
  const qs = p.toString();
  return qs ? `/cards?${qs}` : '/cards';
}

interface Search {
  view?: string;
  tier?: string;
  q?: string;
  page?: string;
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const view: CardView = isView(params.view) ? params.view : 'top';
  const tier: Tier = isTier(params.tier) ? params.tier : 'all';
  const q = params.q?.trim() ?? '';

  // SSR the first page only. Additional pages are loaded client-side via
  // /api/cards + the CardsLoadMore component.
  const [vault, list] = await Promise.all([
    getVaultStats(),
    getCardsList({
      view,
      tier: tier === 'all' ? 'all' : tier,
      q: q || undefined,
      page: 0,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const viewLabel = VIEW_CHIPS.find(c => c.id === view)!.label;
  const tierSub = tier !== 'all' ? ` · ${tierLabel(tier)}` : '';
  const remaining = Math.max(0, list.total - list.rows.length);

  return (
    <div className="pb-6">
      <FilterChips chips={VIEW_CHIPS} value={view} build={id => buildHref({ view: id, tier, q })} />
      <FilterChips chips={TIER_CHIPS} value={tier} build={id => buildHref({ view, tier: id, q })} />
      <CardSearchBar count={list.total} />

      <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
        <KpiTile label="Cards in vault" value={vault.cardsTotal.toLocaleString('en-US')} />
        <KpiTile label="Cards pulled" value={vault.cardsPulled.toLocaleString('en-US')} />
      </div>

      <SectionHead tag="THE WALL" title={`${viewLabel}${tierSub}`} right="TAP TO OPEN" />

      {list.rows.length === 0 ? (
        <EmptyState title="NO CARDS" sub="Try a different search or filter." />
      ) : (
        <div className="mx-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {list.rows.map(c => (
            <CardWallTile key={c.slug} card={c} />
          ))}
        </div>
      )}

      {!q && list.rows.length > 0 && (
        <CardsLoadMore
          view={view}
          tier={tier}
          q={q || undefined}
          initialRemaining={remaining}
          initialPage={0}
        />
      )}

      <div className="mt-4 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Cards are physical PSA-graded slabs, held in MnStr&apos;s insured vault.
          <br />
          † <span style={{ color: 'var(--fg-3)' }}>MnStr FMV</span> is the vault&apos;s appraisal, not market consensus.
        </Mono>
      </div>
    </div>
  );
}
