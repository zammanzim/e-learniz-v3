/* ==========================================================================
   sw.js — E-Learniz v3 Service Worker (PWA)
   - App Shell: Network-First + Cache Fallback (selalu segar saat online, jalan saat offline)
   - CDN (Fonts, FontAwesome, Supabase SDK): Stale-While-Revalidate (cepat & siap offline)
   - Supabase REST GET (/rest/v1/): Network-First + Offline Cache Fallback
   - Media R2: Cache-First (hemat kuota & instan)
   - Supabase Auth & Presign Worker: Network-Only (aman, tidak pernah di-cache)
   ========================================================================== */

const CACHE_VERSION = 'v3.1.0';
const SHELL_CACHE = `elearniz-shell-${CACHE_VERSION}`;
const CDN_CACHE = `elearniz-cdn-${CACHE_VERSION}`;
const DATA_CACHE = `elearniz-data-${CACHE_VERSION}`;
const MEDIA_CACHE = `elearniz-media-${CACHE_VERSION}`;

const ACTIVE_CACHES = [SHELL_CACHE, CDN_CACHE, DATA_CACHE, MEDIA_CACHE];

const APP_SHELL_FILES = [
  './',
  './index.html',
  './login.html',
  './subject.html',
  './subjects.html',
  './tugas.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/skeleton.js',
  './js/config.js',
  './js/time.js',
  './js/db.js',
  './js/auth.js',
  './js/ui.js',
  './js/sidebar.js',
  './js/visitor.js',
  './js/cards.js',
  './js/app.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg'
];

// Install: Pre-cache seluruh App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Cache satu per satu agar jika 1 gagal tidak menggagalkan seluruh instalasi SW
      await Promise.allSettled(
        APP_SHELL_FILES.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Bersihkan cache versi lama & klaim semua tab aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('elearniz-') && !ACTIVE_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Pesan dari halaman (mis. paksa update SW)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper: batasi jumlah item di dalam cache
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await Promise.all(
        keys.slice(0, keys.length - maxItems).map((req) => cache.delete(req))
      );
    }
  } catch (_) {}
}

// Fetch: Strategi hibrida sesuai tipe request
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET dan protokol http/https
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 1. JANGAN PERNAH cache endpoint autentikasi Supabase atau Worker presign R2
  if (
    url.pathname.includes('/auth/v1/') ||
    url.hostname.endsWith('.workers.dev')
  ) {
    return;
  }

  // 2. Supabase REST API GET (/rest/v1/): Network-First dengan fallback cache saat offline
  if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(req, copy);
              trimCache(DATA_CACHE, 80);
            });
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          throw new Error('Offline and no cached data available');
        })
    );
    return;
  }

  // 3. Media Gambar R2: Cache-First (hemat kuota bandwidth & tampil instan)
  if (url.hostname.includes('media-v3.e-learniz.my.id')) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && (res.status === 200 || res.type === 'opaque')) {
          cache.put(req, res.clone());
          trimCache(MEDIA_CACHE, 60);
        }
        return res;
      })
    );
    return;
  }

  // 4. Library CDN (Google Fonts, FontAwesome, Supabase JS SDK): Stale-While-Revalidate
  const isCDN =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('cdn.jsdelivr.net');

  if (isCDN) {
    event.respondWith(
      caches.open(CDN_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // 5. File App Shell Lokal (Same-Origin HTML, CSS, JS, Icons): Network-First + Cache Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw new Error('Offline resource unavailable');
        })
    );
  }
});
