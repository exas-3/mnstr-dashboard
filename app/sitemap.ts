import type { MetadataRoute } from 'next';
import { getAllCardSlugs, getAllWalletAddrs } from '@/lib/queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

// 1h ISR: sitemap.xml is regenerated at most once an hour, so even
// aggressive crawlers won't hammer the DB.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE_URL}/tiers`,   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE_URL}/wallets`, lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${SITE_URL}/cards`,   lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${SITE_URL}/marketplace`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${SITE_URL}/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];

  const [cards, wallets] = await Promise.all([
    getAllCardSlugs().catch(() => []),
    getAllWalletAddrs().catch(() => []),
  ]);

  const cardEntries: MetadataRoute.Sitemap = cards.map(c => ({
    url: `${SITE_URL}/cards/${c.id}`,
    lastModified: c.lastModified ? new Date(c.lastModified) : now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const walletEntries: MetadataRoute.Sitemap = wallets.map(w => ({
    url: `${SITE_URL}/wallets/${w.id}`,
    lastModified: w.lastModified ? new Date(w.lastModified) : now,
    changeFrequency: 'weekly',
    priority: 0.4,
  }));

  // Warn when we approach the single-sitemap ceiling so we know to shard.
  const total = staticRoutes.length + cardEntries.length + walletEntries.length;
  if (total > 30_000) {
    console.warn(`[sitemap] ${total} entries — approaching the 50k single-file limit; consider sharding.`);
  }

  return [...staticRoutes, ...cardEntries, ...walletEntries];
}
