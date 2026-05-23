import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MnStr · Watch',
    short_name: 'MnStr',
    description:
      'A treasury of monsters. Public dashboard for the MnStr gacha card vault on MegaETH.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1812',
    theme_color: '#d6a04a',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
