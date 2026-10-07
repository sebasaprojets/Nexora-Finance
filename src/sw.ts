/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

// Precache do app shell (gerado no build).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: navegações caem no index.html (offline básico).
// Caminhos relativos ao escopo do SW: funciona na raiz ou em subpasta (GitHub Pages).
const scoped = (path: string) => new URL(path, self.registration.scope).href;

registerRoute(new NavigationRoute(createHandlerBoundToURL(scoped('index.html'))));

registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({ cacheName: 'nexora-assets', plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })] }),
);
registerRoute(({ request }) => request.destination === 'script' || request.destination === 'style', new StaleWhileRevalidate({ cacheName: 'nexora-static' }));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// Web Push: payload JSON { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Nexora Finance', {
      body: payload.body ?? '',
      icon: scoped('icons/icon-192.png'),
      badge: scoped('icons/badge-72.png'),
      tag: payload.tag,
      data: { url: payload.url ?? scoped('app/notificacoes') },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? scoped('app');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          void (c as WindowClient).navigate(url);
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
