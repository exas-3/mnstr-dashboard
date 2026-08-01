import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api/ is server-only; /logo-preview is a designer reference page;
        // /embed/ is the chromeless OBS variant (duplicate content) — the
        // ?embed= rule covers legacy links from the old query-param embed.
        disallow: ['/api/', '/logo-preview', '/embed/', '/*?embed='],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
