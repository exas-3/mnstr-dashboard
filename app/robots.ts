import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mnstr.watch';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api/ is server-only; /logo-preview is a designer reference page;
        // ?embed= renders the chromeless OBS variant (duplicate content).
        disallow: ['/api/', '/logo-preview', '/*?embed='],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
