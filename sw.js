// =========================================================================
// SW — E-Learniz v3 (PWA)
// Pola identik OSIS TARPAN ONE: App shell precache + runtime cache.
// Aman untuk Supabase & Presign Worker (API tidak di-cache).
// =========================================================================

const VERSI = "elearniz-v27";
const STATIS = VERSI + "-statis";
const RUNTIME = VERSI + "-runtime";

// App shell — SEMUA halaman + script lokal di-precache biar offline-ready
const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./materi.html",
  "./subject.html",
  "./subjects.html",
  "./tugas.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./manifest.json",
  "./css/style.css",
  "./js/skeleton.js",
  "./js/config.js",
  "./js/time.js",
  "./js/db.js",
  "./js/auth.js",
  "./js/theme.js",
  "./js/ui.js",
  "./js/sidebar.js",
  "./js/visitor.js",
  "./js/cards.js",
  "./js/app.js",
  "./js/pwa.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  // Catatan: JANGAN skipWaiting() di sini. SW baru wajib menunggu sampai
  // halaman memintanya via pesan SKIP_WAITING (js/pwa.js). skipWaiting
  // otomatis = take-over tiba-tiba + controllerchange + WebAPK install crash.
  e.waitUntil(caches.open(STATIS).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => k.startsWith("elearniz-") && k !== STATIS && k !== RUNTIME,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Update instan saat ada deploy baru (dipanggil dari js/pwa.js)
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING" || (e.data && e.data.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});

// Jangan cache API/auth Supabase & Presign Worker — selalu network
function apiJanganCache(url) {
  return (
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/") ||
    url.pathname.includes("/realtime/v1/") ||
    url.pathname.includes("/presign")
  );
}

// Stale-while-revalidate: sajikan cache dulu, update di background.
// Saat fetch gagal (offline): fallback cache persis, lalu cache tanpa
// query (?v=7) biar URL berversion tetap ketemu precache.
async function basiDulu(request, namaCache) {
  const daftarCache = namaCache === STATIS ? [STATIS] : [namaCache, STATIS];
  const cacheUtama = await caches.open(namaCache);
  let cached = null;
  for (const nama of daftarCache) {
    const c = await caches.open(nama);
    const m = await c.match(request, { ignoreSearch: false });
    if (m) { cached = m; break; }
  }
  const ambil = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque"))
        cacheUtama.put(request, res.clone());
      return res;
    })
    .catch(async () => {
      if (cached) return cached;
      if (new URL(request.url).origin === self.location.origin) {
        for (const nama of daftarCache) {
          const c = await caches.open(nama);
          const tanpaQuery = await c.match(request, { ignoreSearch: true });
          if (tanpaQuery) return tanpaQuery;
        }
      }
      throw new Error("offline");
    });
  return cached || ambil;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) Navigasi halaman (termasuk hash-route SPA) — network dulu, fallback cache/offline
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(RUNTIME);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (url.origin === self.location.origin) {
            const shell =
              (await caches.match("./index.html")) ||
              (await caches.match("./"));
            if (shell) return shell;
          }
          return caches.match("./offline.html");
        }
      })(),
    );
    return;
  }

  // 2) API Supabase & Worker Presign — network only (jangan sajikan basi)
  if ((url.hostname.endsWith("supabase.co") || url.pathname.includes("/presign")) && apiJanganCache(url)) {
    return;
  }

  // 3) Aset lokal (css/js/gambar/manifest/icons) — stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(basiDulu(req, RUNTIME));
    return;
  }

  // 4) Lintas origin: CDN (Google Fonts, FontAwesome, Supabase SDK) + media R2
  e.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === "opaque"))
          cache.put(req, res.clone());
        return res;
      } catch {
        if (cached) return cached;
        if (req.destination === "image") {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#f3f7ff"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#64748b" text-anchor="middle">Offline</text></svg>',
            { headers: { "Content-Type": "image/svg+xml" } },
          );
        }
        throw new Error("offline");
      }
    })(),
  );
});
