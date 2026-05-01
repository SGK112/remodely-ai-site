/**
 * Network-first service worker for remodely.ai
 *
 * Render's static-site header config silently ignores catch-all path globs
 * (/*, /**, literal /), so the homepage and /tools/* paths keep falling back
 * to "public, max-age=0, s-maxage=300" and Cloudflare Edge serves stale HTML
 * for 5 minutes after every deploy. Workaround: a service worker that
 * intercepts navigation requests and does network-first with a stale-cache
 * fallback for offline-only.
 *
 * Bump SW_VERSION to force every existing client to update immediately.
 */
const SW_VERSION = 'remodely-v3';
const CACHE_NAME = 'remodely-html-' + SW_VERSION;

// Install: take control immediately on next page load.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate: clean up old caches and start serving in already-open tabs.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Only intercept navigation requests for HTML documents on our origin.
// CSS, JS, images, fonts — let the browser's normal cache work; they're
// fingerprinted with ?v=N so they're already safe to cache aggressively.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const acceptsHtml = (req.headers.get('accept') || '').includes('text/html');
  const isNavigation = req.mode === 'navigate' || acceptsHtml;
  if (!isNavigation) return;

  event.respondWith(
    (async () => {
      try {
        // Force a fresh fetch with cache: 'no-store' so neither the browser
        // HTTP cache nor any intermediate edge cache layer can hand us stale.
        const fresh = await fetch(req, { cache: 'no-store' });
        // Save a copy for offline fallback only — never serve from this on
        // a normal load. Capped to successful responses on this origin.
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (err) {
        // Offline / network failure — fall back to the last cached HTML.
        const cached = await caches.match(req);
        if (cached) return cached;
        // No cache, no network — serve a tiny offline placeholder.
        return new Response(
          '<!doctype html><meta charset=utf-8><title>Offline</title>' +
          '<body style="font-family:system-ui;background:#0a0f1a;color:#fff;padding:2rem;text-align:center;">' +
          '<h1>Offline</h1><p>Reconnect and reload to fetch the latest from remodely.ai.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })()
  );
});
