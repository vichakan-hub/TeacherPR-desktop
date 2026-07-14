const CACHE_VERSION = 'teacherpr-desktop-v1';
const APP_CACHE = `teacherpr-app-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

async function cacheAppShell() {
  const cache = await caches.open(APP_CACHE);

  await Promise.all(
    APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });

        // ไม่ cache partial response (206) เพื่อป้องกัน Cache.put error
        if (response.ok && response.status === 200) {
          await cache.put(url, response.clone());
        }
      } catch (error) {
        console.warn('Skip precache:', url, error);
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('teacherpr-app-') && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // ห้าม cache Range request เพราะมักได้สถานะ 206
  if (request.headers.has('range')) return;

  const url = new URL(request.url);

  // Navigation: ใช้ network ก่อน แล้ว fallback ไปหน้า cached
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && response.status === 200) {
            const cache = await caches.open(APP_CACHE);
            await cache.put('./index.html', response.clone());
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./'))
          );
        })
    );
    return;
  }

  // Cache เฉพาะไฟล์จากโดเมนเดียวกัน
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        const response = await fetch(request);

        if (response.ok && response.status === 200) {
          const cache = await caches.open(APP_CACHE);
          await cache.put(request, response.clone());
        }

        return response;
      })
    );
  }
});
