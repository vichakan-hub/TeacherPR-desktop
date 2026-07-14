const CACHE_NAME = 'teacherpr-desktop-v1';

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

/* ติดตั้ง Service Worker และเก็บไฟล์หลัก */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ลบ Cache เวอร์ชันเก่า */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* จัดการการเรียกไฟล์ */
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  /*
   * ไม่ Cache คำขอแบบ Range
   * ป้องกัน Error:
   * Partial response status code 206 is unsupported
   */
  if (request.headers.has('range')) {
    event.respondWith(fetch(request));
    return;
  }

  const requestUrl = new URL(request.url);

  /*
   * ข้อมูลจาก Supabase และ API ต้องดึงข้อมูลสดเสมอ
   * ไม่เก็บลง Cache
   */
  if (
    requestUrl.hostname.includes('supabase.co') ||
    requestUrl.pathname.includes('/rest/v1/') ||
    requestUrl.pathname.includes('/rpc/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  /*
   * หน้าเว็บหลักใช้ Network First
   * เพื่อให้ได้โค้ดเวอร์ชันล่าสุดก่อน
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put('./index.html', responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );

    return;
  }

  /*
   * ไฟล์ CSS, JS, รูปภาพ และไอคอน
   * ใช้ Cache ก่อน แล้วค่อยโหลดจากอินเทอร์เน็ต
   */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        /*
         * ห้าม Cache Response 206
         * และห้าม Cache Response ที่ผิดพลาด
         */
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type === 'opaque'
        ) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });

        return networkResponse;
      });
    })
  );
});
