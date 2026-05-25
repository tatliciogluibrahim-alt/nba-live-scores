// No Noise Scores — service worker.
//
// Stage A (now): enables local notifications fired via
// `registration.showNotification()`. This is REQUIRED for iOS PWA
// notifications to work — `new Notification()` from a page silently fails
// on iOS Safari home-screen apps. Without this SW, iPhones get nothing.
//
// Stage B (later): the `push` event handler below is wired so when we
// stand up a Web Push backend + VAPID keys, no SW change is needed —
// just publish to the subscription endpoint and the device renders.
//
// No offline caching here. We're not shipping an offline shell yet;
// adding a `fetch` handler that doesn't cache would only add latency.
// Re-revisit when offline becomes a real requirement.
//
// Update policy: this worker activates immediately. That keeps first-run
// iOS PWA notifications reliable after install, but it also means a new
// deploy can claim an already-open session. If/when an offline shell lands,
// add an in-app "new version available" refresh affordance before removing
// skipWaiting()/clients.claim().
//
// Push policy: every push event below renders a visible notification.
// Silent/background-sync pushes are intentionally unsupported until there
// is a specific product flow for them.

const SW_VERSION = '1.0.0';
const APP_ICON = '/app-icon-192.png';

self.addEventListener('install', () => {
  // Activate this version on first install without waiting for all
  // existing tabs to close — important for friends who just added to
  // home screen and expect notifications to work this session, not next.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any uncontrolled clients (the page that just
  // registered us). Without this the first session falls back to
  // page-level `Notification` which is broken on iOS PWAs.
  event.waitUntil(self.clients.claim());
});

// Notification tap — focus an existing app window if one exists,
// otherwise open the app at the URL we stashed in `data.url` (or '/').
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

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

// Push handler — Stage B placeholder. Until a backend posts to the
// device's push subscription endpoint, this is dormant. The shape it
// expects: { title, body, url?, tag? } as JSON in the push payload.
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
      data: { url: payload.url || '/', swVersion: SW_VERSION },
    })
  );
});
