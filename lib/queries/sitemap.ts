import { sql } from '@/db/client';

/* ─────────────────────────────────────────────────────────────
 * Sitemap primitives — bulk slug/addr lists for /sitemap.xml.
 * Each row also carries the latest mtime so search engines can
 * prioritise re-crawls of recently-active entries.
 * ───────────────────────────────────────────────────────────── */

export interface SitemapEntry {
  id: string;
  lastModified: string | null;
}

export async function getAllCardSlugs(): Promise<SitemapEntry[]> {
  return sql<SitemapEntry[]>`
    SELECT
      c.slug                          AS id,
      MAX(p.pulled_at)::text          AS "lastModified"
    FROM cards c
    LEFT JOIN pulls p ON p.card_slug = c.slug
    GROUP BY c.slug
    ORDER BY c.slug
  `;
}

export async function getAllWalletAddrs(): Promise<SitemapEntry[]> {
  return sql<SitemapEntry[]>`
    SELECT
      wallet                          AS id,
      MAX(pulled_at)::text            AS "lastModified"
    FROM pulls_enriched
    GROUP BY wallet
    ORDER BY wallet
  `;
}
