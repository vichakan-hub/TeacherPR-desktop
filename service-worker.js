/* =====================================================
   TeacherPR Service Worker
   ===================================================== */

const CACHE_NAME = 'teacherpr-desktop-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',

  /* ===== TeacherPR Assets ===== */
  './assets/school-logo.png',

  /* ===== QR Code Generator ===== */
  './vendor/qrcode.min.js',

  /* ===== App Icons ===== */
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];


/* =====================================================
   INSTALL
   เก็บไฟล์หลักของแอปไว้ใน Cache
   ===================================================== */

self.addEventListener('install', event => {

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );

});


/* =====================================================
   ACTIVATE
   ลบ Cache เวอร์ชันเก่า
   ===================================================== */

self.addEventListener('activate', event => {

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {

        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );

      })
      .then(() => {
        return self.clients.claim();
      })
  );

});


/* =====================================================
   FETCH
   ===================================================== */

self.addEventListener('fetch', event => {

  const request = event.request;


  /* -----------------------------------------------------
     รับเฉพาะ GET
     ----------------------------------------------------- */

  if (request.method !== 'GET') {
    return;
  }


  /* -----------------------------------------------------
     ไม่ Cache Range Request

     ป้องกัน Error:
     Partial response status code 206 is unsupported
     ----------------------------------------------------- */

  if (request.headers.has('range')) {

    event.respondWith(
      fetch(request)
    );

    return;
  }


  const requestUrl = new URL(request.url);


  /* -----------------------------------------------------
     Supabase / REST / RPC

     ต้องดึงข้อมูลสดเสมอ
     ห้าม Cache
     ----------------------------------------------------- */

  if (
    requestUrl.hostname.includes('supabase.co') ||
    requestUrl.pathname.includes('/rest/v1/') ||
    requestUrl.pathname.includes('/rpc/')
  ) {

    event.respondWith(
      fetch(request)
    );

    return;
  }


  /* -----------------------------------------------------
     Navigation / หน้าเว็บหลัก

     Network First

     1. พยายามเอาหน้าล่าสุดจาก Network
     2. ถ้าสำเร็จ เก็บ index.html ใหม่
     3. ถ้า Offline ใช้ index.html จาก Cache
     ----------------------------------------------------- */

  if (request.mode === 'navigate') {

    event.respondWith(

      fetch(request)

        .then(response => {

          if (
            response &&
            response.status === 200
          ) {

            const responseClone =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  './index.html',
                  responseClone
                );

              });
          }

          return response;
        })

        .catch(async () => {

          const cachedIndex =
            await caches.match('./index.html');

          if (cachedIndex) {
            return cachedIndex;
          }


          const cachedRoot =
            await caches.match('./');

          if (cachedRoot) {
            return cachedRoot;
          }


          return new Response(
            'TeacherPR ไม่สามารถเชื่อมต่อเครือข่ายได้',
            {
              status: 503,
              statusText: 'Offline',
              headers: {
                'Content-Type':
                  'text/plain; charset=utf-8'
              }
            }
          );

        })

    );

    return;
  }


  /* -----------------------------------------------------
     Static Assets

     เช่น
     - JS
     - CSS
     - PNG
     - Icons
     - QR Library

     Cache First
     ----------------------------------------------------- */

  event.respondWith(

    caches
      .match(request)

      .then(cachedResponse => {

        if (cachedResponse) {
          return cachedResponse;
        }


        return fetch(request)

          .then(networkResponse => {

            /*
             * ห้าม Cache:
             * - Response ที่ไม่สำเร็จ
             * - HTTP 206
             * - opaque response
             */

            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type === 'opaque'
            ) {

              return networkResponse;
            }


            const responseClone =
              networkResponse.clone();


            caches
              .open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  request,
                  responseClone
                );

              });


            return networkResponse;

          });

      })

  );

});
