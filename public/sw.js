const CACHE = 'cover-league-v1'

// Cache static shell assets on install
self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(['/', '/picks', '/standings', '/manifest.webmanifest'])
    )
  )
})

// Take control immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Never cache API calls or auth — always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return
  }

  // Cache-first for static assets; network-first for pages
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // Network-first for everything else (pages get fresh data)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
