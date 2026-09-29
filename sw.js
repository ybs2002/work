// =============================================
// 서비스 워커 (오프라인 도우미)
// 앱 파일을 폰에 저장해 두었다가, 인터넷이 없을 때 꺼내 써요.
// =============================================

const CACHE_NAME = "family-meal-v1";

// 폰에 저장해 둘 파일 목록
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// 처음 설치될 때: 파일들을 저장해 둬요
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// 새 버전이 켜질 때: 예전에 저장한 것들은 지워요
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// 파일을 가져올 때: 인터넷 먼저 → 안 되면 저장해 둔 것
// (그래서 앱을 고치면 인터넷이 될 때 바로 새 버전이 보여요)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
