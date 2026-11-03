// Only this application's Piper assets use this cache; the origin may be shared.
const CACHE_PREFIX = "chrome-on-aituber-piper-";
const MANIFEST_URL = `${self.registration.scope}piper/manifest.json`;
let activeCacheName = null;
let resolvingCache = null;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // The page removes older content versions after storing the selected voice.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const { type, cacheName } = event.data ?? {};
  if (type !== "piper-cache" || !event.source?.url?.startsWith(self.registration.scope) ||
      !new RegExp(`^${CACHE_PREFIX}(?:[a-f0-9]{64}|unversioned)$`).test(cacheName)) return;
  activeCacheName = cacheName;
  event.ports[0]?.postMessage({ selected: true });
});

async function getCacheName() {
  if (activeCacheName) return activeCacheName;
  // A worker can be stopped and restarted between the page's prefetch and the
  // engine's request. Recover the content version without relying on messages.
  if (!resolvingCache) {
    resolvingCache = (async () => {
      try {
        const response = await fetch(MANIFEST_URL, {
          cache: "no-store", signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const manifest = await response.json();
        if (!/^[a-f0-9]{64}$/.test(manifest.version)) throw new Error("Invalid Piper manifest version");
        return `${CACHE_PREFIX}${manifest.version}`;
      } catch (error) {
        console.warn("Piper manifest unavailable in worker:", error);
        return `${CACHE_PREFIX}unversioned`;
      }
    })();
  }
  const recovered = await resolvingCache;
  activeCacheName ??= recovered;
  return activeCacheName;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.url === MANIFEST_URL || request.cache === "reload" ||
      !request.url.startsWith(`${self.registration.scope}piper/`)) return;

  event.respondWith((async () => {
    try {
      const cache = await caches.open(await getCacheName());
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
    } catch (error) {
      console.warn("Piper cache read unavailable; using network:", error);
    }
    return fetch(request);
  })());
});
