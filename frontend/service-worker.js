const CACHE_NAME = 'chatzeus-cache-v1';
const urlsToCache = [
  '/',
  'index.html', // يمكنك استخدام النسبي
  'style.css',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',

  // أضف هنا كل ملفات JS التي تستخدمها في index.html
  'core.js',
  'ui_providers.js',
  'files.js',
  'chat_stream.js',
  'chat_management.js',
  'settings.js',
  'ui_misc.js',
  'auth.js'
  // ملاحظة: لقد أزلت 'script.js' لأنه غير مستخدم في صفحتك
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

