// 인터넷이 끊겨도 일기앱이 열리게 하는 서비스 워커.
// 앱 파일과 글꼴만 저장해 둔다. 일기 내용은 여기서 다루지 않는다.
// index.html을 고쳐서 올릴 때 VERSION을 올리면 옛 캐시가 지워진다.
const VERSION = 'v2';
const CACHE = 'weekly-record-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const own = url.origin === location.origin;
  // 앱 파일과 글꼴만 다루고, 나머지(나중에 붙일 OneDrive 요청 등)는 그대로 통과
  if (!own && !FONT_HOSTS.includes(url.hostname)) return;

  // 앱 화면: 인터넷이 되면 새 버전, 안 되면 저장해 둔 것
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 아이콘·글꼴: 저장해 둔 걸 먼저 쓰고 뒤에서 새로 받아 둠
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
