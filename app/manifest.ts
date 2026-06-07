import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cover League',
    short_name: 'Cover',
    description: "NFL Pick'em · Against the spread",
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1b2e',
    theme_color: '#1a1b2e',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/icon?size=192', sizes: '192x192', type: 'image/png' },
      { src: '/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
