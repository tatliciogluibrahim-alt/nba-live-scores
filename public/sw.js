// No Noise Scores — service worker.
//
// Responsibilities:
//   1. Local notifications via registration.showNotification()
//      (required for iOS PWA — page-level `new Notification()` is
//      silently broken on home-screen installs)
//   2. Real Web Push delivery (Stage B+, see /api/push/* + cron)
//   3. Offline shell caching (Phase 2.5) — when the device is offline,
//      cached app code + a fallback page render instead of the
//      browser's "no internet" error
//
// Update policy: this worker activates immediately. That keeps first-run
// iOS PWA notifications reliable after install. Cost: a new deploy can
// claim an already-open session. The cache-bust below ensures the new
// version's cached assets replace the old version's on activation, so
// claimed clients pick up the new build.
//
// Push policy: every push event renders a visible notification. Silent
// background-sync pushes are intentionally unsupported until there is
// a product flow for them.

const SW_VERSION = '1.2.0';
const APP_ICON = '/app-icon-192.png';

// Two named caches, both versioned. Static cache: fingerprinted Next.js
// assets that never change in-place (cache-first forever). Runtime
// cache: HTML pages + other GET responses (network-first, falls back).
const STATIC_CACHE = `nns-static-${SW_VERSION}`;
const RUNTIME_CACHE = `nns-runtime-${SW_VERSION}`;

// Things we precache at install so a totally cold offline launch still
// shows the app shell. Keep this list short — long lists make installs
// slow and brittle if any one URL 404s.
const PRECACHE_URLS = [
  '/',
  '/following',
  '/watching',
  '/settings',
  '/favicon.svg',
  '/app-icon-192.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  // Activate this version on first install without waiting for all
  // existing tabs to close — important for friends who just added to
  // home screen and expect notifications to work this session, not next.
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      // Best-effort precache. If any single URL fails, don't fail the
      // whole install — the runtime fetch handler will pick up misses.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
    } catch {
      /* never fail install on cache errors */
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up caches from previous SW versions. We match on prefix so
    // future bumps (1.2.0, 1.3.0) wipe their predecessors automatically.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(
          (k) =>
            (k.startsWith('nns-static-') && k !== STATIC_CACHE) ||
            (k.startsWith('nns-runtime-') && k !== RUNTIME_CACHE)
        )
        .map((k) => caches.delete(k))
    );
    // Take control of any uncontrolled clients (the page that just
    // registered us). Without this the first session falls back to
    // page-level `Notification` which is broken on iOS PWAs.
    await self.clients.claim();
  })());
});

// ── Fetch handler — offline shell ───────────────────────────────────
//
// Strategy by request type:
//   • /_next/static/*    → cache-first (fingerprinted, immutable)
//   • /_next/image/*     → cache-first (optimized image cache)
//   • /api/*             → never cache (always network; let it fail
//                         so React's data hooks fall back to empty states)
//   • Page navigations   → network-first with cache fallback;
//                         on failure, fall back to cached `/` (so a
//                         cold-offline launch still shows the app)
//   • Other GETs (icons, fonts, etc.) → cache-first then network
//
// Cache mutation only happens for successful 2xx responses. Anything
// else (4xx/5xx) is returned to the caller without polluting the cache.

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Service Worker fetch only handles same-origin GETs. POST/PUT/etc.
  // and cross-origin requests pass through untouched.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses or the cron route. Let the network handle
  // them; if offline, the UI's existing fallback paths kick in.
  if (url.pathname.startsWith('/api/')) return;

  // Static immutable assets — cache forever (until version bump wipes them).
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image/') ||
    url.pathname.startsWith('/splash/')
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Page navigations — network-first so users always see fresh content
  // when online, fall back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(req));
    return;
  }

  // Other same-origin GETs (icons, fonts, manifest, etc.) — cache-first.
  event.respondWith(cacheFirst(req, RUNTIME_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
    return res;
  } catch {
    // No cache + offline. Return a synthetic error response rather than
    // throwing — the SW spec requires a Response.
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function navigationStrategy(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
    return res;
  } catch {
    // Network failed — try the exact cached version of this URL first,
    // then fall back to the cached root (`/`). The root is always
    // precached at install, so a fresh-offline launch still shows the
    // app's shell instead of the browser's error page.
    const cached = await cache.match(req);
    if (cached) return cached;
    const root = await cache.match('/');
    if (root) return root;
    return new Response(
      '<!doctype html><title>Offline</title><p>No connection.</p>',
      { status: 503, headers: { 'content-type': 'text/html' } }
    );
  }
}

// ── Notifications ──────────────────────────────────────────────────

// Notification tap — focus an existing app window if one exists,
// otherwise open the app at the URL we stashed in `data.url` (or '/app').
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/app';

  // Open-rate tracking (Phase 21C). Fire-and-forget a beacon to record
  // that a notification of this event type was opened. Best-effort —
  // never blocks navigation, swallows all errors. The dashboard divides
  // notif.open.<type> by notif.sent.<type> for a per-type open rate.
  if (data.eventType) {
    event.waitUntil(
      fetch('/api/push/track-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: data.eventType }),
        keepalive: true,
      }).catch(() => undefined)
    );
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    // Prefer focusing an already-open window so we don't spawn duplicates.
    const existing = windows.find((c) => 'focus' in c);
    if (existing) {
      try {
        if (existing.navigate) await existing.navigate(targetUrl);
      } catch {
        // navigate() can throw cross-origin or when the client is in a
        // state that doesn't allow programmatic nav. Focusing is enough.
      }
      return existing.focus();
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});

// Push handler — renders the notification body for Stage C cron-driven
// fanouts. Payload shape: { title, body, url?, tag? } as JSON.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'No Noise Scores',
      body: event.data ? event.data.text() : '',
    };
  }

  const title = payload.title || 'No Noise Scores';
  const body = payload.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: APP_ICON,
      badge: APP_ICON,
      tag: payload.tag,
      data: {
        url: payload.url || '/app',
        eventType: payload.eventType || null,
        swVersion: SW_VERSION,
      },
    })
  );
});
