// 서비스 워커 - TodoList 오프라인 지원
const CACHE_NAME = 'todolist-v3-force-update' // Version bump again
const urlsToCache = [
  '/todolist/',
  '/todolist/index.html',
  '/todolist/manifest.json'
]

// 설치 이벤트
self.addEventListener('install', (event) => {
  // 대기 중인 서비스 워커를 강제로 활성화 (즉시 교체)
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
})

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // 활성화 즉시 클라이언트 제어권 가져오기 (새로고침 없이 반영)
      return self.clients.claim()
    })
  )
})

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response
        }

        // 없으면 네트워크에서 가져오기
        return fetch(event.request)
      })
  )
})