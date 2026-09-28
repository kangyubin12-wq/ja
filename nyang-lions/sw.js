/* 꾹꾹이즈 오프라인 캐시: 항상 네트워크 먼저(업데이트 바로 반영), 안 되면 저장본 */
const CACHE = 'kkukkukiz-v1';
const CORE = ['./', './index.html', './cat-sprites.png', './favicon.svg', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/desktop/')) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === 'navigate' ? './index.html' : r, cp)); }
    return res;
  }).catch(() => caches.match(r.mode === 'navigate' ? './index.html' : r, { ignoreSearch: true })));
});
