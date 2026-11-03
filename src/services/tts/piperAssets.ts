import type { PiperVoice } from "../../types";

const CACHE_PREFIX = "chrome-on-aituber-piper-";
const FALLBACK_CACHE_NAME = `${CACHE_PREFIX}unversioned`;
const STALL_TIMEOUT_MS = 30_000;
const SHARED_FILES = [
  "dist/ort-wasm-simd.wasm",
  "dist/openjtalk.wasm",
  "assets/voice/mei_normal.htsvoice",
  "assets/dict/sys.dic",
  "assets/dict/matrix.bin",
  "assets/dict/char.bin",
  "assets/dict/left-id.def",
  "assets/dict/right-id.def",
  "assets/dict/pos-id.def",
  "assets/dict/rewrite.def",
  "assets/dict/unk.dic",
];

interface PiperManifestFile {
  path: string;
  size: number;
  sha256: string;
}
interface PiperManifest {
  version: string;
  files: PiperManifestFile[];
}

async function sha256(bytes: BufferSource): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Decoded sizes remain correct when the host applies gzip or Brotli. */
async function fetchManifest(signal: AbortSignal, paths: string[]): Promise<PiperManifest | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}piper/manifest.json`, {
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json() as PiperManifest;
    if (!/^[a-f0-9]{64}$/.test(manifest.version) || !Array.isArray(manifest.files) ||
      !manifest.files.every((file) => typeof file.path === "string" &&
        /^[a-zA-Z0-9_./-]+$/.test(file.path) && !file.path.startsWith("/") &&
        !file.path.split("/").some((part) => part === ".." || part === "." || !part) &&
        Number.isSafeInteger(file.size) && file.size > 0 && /^[a-f0-9]{64}$/.test(file.sha256)) ||
      new Set(manifest.files.map((file) => file.path)).size !== manifest.files.length ||
      !paths.every((file) => manifest.files.some((entry) => entry.path === file))) {
      throw new Error("Invalid Piper manifest inventory");
    }
    const canonical = [...manifest.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      .map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    if (await sha256(new TextEncoder().encode(JSON.stringify(canonical))) !== manifest.version) {
      throw new Error("Invalid Piper manifest version");
    }
    return manifest;
  } catch (error) {
    signal.throwIfAborted();
    console.warn("Piper manifest unavailable; using header sizes and an unversioned cache:", error);
    return null;
  }
}

/** Tell the worker which content version to serve, even after a page reload. */
async function selectCache(cacheName: string): Promise<boolean> {
  const worker = navigator.serviceWorker.controller;
  if (!worker) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (selected: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(selected);
    };
    const timer = setTimeout(() => finish(false), 3000);
    channel.port1.onmessage = () => finish(true);
    try {
      worker.postMessage({ type: "piper-cache", cacheName }, [channel.port2]);
    } catch (error) {
      console.warn("Piper worker cache selection unavailable; using network:", error);
      finish(false);
    }
  });
}

export class PiperPreparationError extends Error {
  readonly code: "stalled" | "downloadFailed" | "initTimeout";
  constructor(code: "stalled" | "downloadFailed" | "initTimeout") {
    super(`Piper preparation failed: ${code}`);
    this.code = code;
  }
}

export interface PiperDownloadState {
  voice: PiperVoice | null;
  downloading: boolean;
  loadedBytes: number;
  totalBytes: number | null;
  error: PiperPreparationError | null;
}

const EMPTY_STATE: PiperDownloadState = {
  voice: null, downloading: false, loadedBytes: 0, totalBytes: null, error: null,
};
let state = EMPTY_STATE;
const listeners = new Set<() => void>();
let task: { voice: PiperVoice; controller: AbortController; promise: Promise<boolean> } | null = null;

export const getPiperDownloadState = () => state;
export function subscribePiperDownload(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: PiperDownloadState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function registerPiperServiceWorker(): void {
  if (!navigator.serviceWorker) return;
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((error) => console.warn("Piper service worker unavailable; using network:", error));
}

async function waitForServiceWorker(): Promise<boolean> {
  if (!navigator.serviceWorker || !window.caches) return false;
  const expected = new URL(`${import.meta.env.BASE_URL}sw.js`, location.href).href;
  const controlled = () => navigator.serviceWorker.controller?.scriptURL === expected;
  if (controlled()) return true;
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      resolve(controlled());
    };
    const changed = () => { if (controlled()) finish(); };
    const timer = setTimeout(finish, 3000);
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    changed();
  });
}

export function shouldAutoPreparePiper(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData && !window.matchMedia("(pointer: coarse)").matches &&
    window.innerWidth >= 760;
}

export function cancelPiperPrefetch(): void {
  task?.controller.abort();
}

export async function deletePiperAssets(): Promise<void> {
  const previous = task;
  previous?.controller.abort();
  await previous?.promise.catch(() => undefined);
  if (window.caches) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX))
      .map((name) => caches.delete(name)));
  }
  publish(EMPTY_STATE);
}

/** Return true only after every file is cached and the worker confirms selection.
 * Cache Storage is optional; a failed write must never prevent synthesis.
 */
export function prefetchPiperVoice(
  voice: PiperVoice,
  assets: { configFile: string; modelFile: string },
): Promise<boolean> {
  if (task?.voice === voice && !task.controller.signal.aborted) return task.promise;
  const previous = task;
  previous?.controller.abort();
  const controller = new AbortController();
  const job = (async () => {
    await previous?.promise.catch(() => undefined);
    controller.signal.throwIfAborted();
    publish({ ...EMPTY_STATE, voice, downloading: true });
    try {
      if (!(await waitForServiceWorker())) {
        console.warn("Piper persistent cache unavailable; loading voice files from network.");
        return false;
      }
      controller.signal.throwIfAborted();
      const paths = [...SHARED_FILES, `models/${assets.configFile}`, `models/${assets.modelFile}`];
      const manifest = await fetchManifest(controller.signal, paths);
      const cacheName = manifest ? `${CACHE_PREFIX}${manifest.version}` : FALLBACK_CACHE_NAME;
      let cache: Cache;
      try {
        cache = await caches.open(cacheName);
      } catch (error) {
        console.warn("Piper Cache Storage unavailable; using network:", error);
        return false;
      }
      const selected = await selectCache(cacheName);
      void navigator.storage?.persist?.().catch((error) =>
        console.warn("Piper persistent storage request failed:", error));
      const urls = paths.map((file) => `${import.meta.env.BASE_URL}piper/${file}`);
      const entries = paths.map((file) => manifest?.files.find((entry) => entry.path === file));
      const sizes: (number | null)[] = entries.map((entry) => entry?.size ?? null);
      const received = urls.map(() => 0);
      const pending: number[] = [];
      const report = () => publish({
        voice, downloading: true, error: null,
        loadedBytes: received.reduce((sum, bytes) => sum + bytes, 0),
        totalBytes: sizes.length === urls.length && sizes.every((size) => size !== null)
          ? sizes.reduce<number>((sum, size) => sum + (size ?? 0), 0) : null,
      });
      for (const [i, url] of urls.entries()) {
        controller.signal.throwIfAborted();
        let hit: Response | undefined;
        try {
          hit = await cache.match(url);
        } catch (error) {
          console.warn("Piper cache read unavailable; using network:", error);
          return false;
        }
        if (hit) {
          // Count cached files without reading another copy of the large body.
          const size = sizes[i] ?? (Number(hit.headers.get("content-length")) || null);
          sizes[i] = size;
          received[i] = size ?? 0;
        } else {
          pending.push(i);
        }
      }
      await Promise.all(pending.map(async (i) => {
        if (sizes[i] !== null) return;
        controller.signal.throwIfAborted();
        const headController = new AbortController();
        const abort = () => headController.abort();
        controller.signal.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(abort, 5000);
        try {
          const head = await fetch(urls[i], { method: "HEAD", signal: headController.signal });
          sizes[i] = head.ok && !head.headers.get("content-encoding")
            ? Number(head.headers.get("content-length")) || null : null;
        } catch {
          sizes[i] = null;
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", abort);
        }
      }));
      report();
      // Sequential streaming bounds memory and makes cancellation predictable.
      for (const i of pending) {
        controller.signal.throwIfAborted();
        let timer: ReturnType<typeof setTimeout>;
        const resetStall = () => {
          clearTimeout(timer);
          timer = setTimeout(() => controller.abort(new PiperPreparationError("stalled")), STALL_TIMEOUT_MS);
        };
        resetStall();
        try {
          // Bypass both the worker and HTTP cache so an old version at the same
          // URL cannot be copied into the new content-versioned cache.
          const response = await fetch(urls[i], { signal: controller.signal, cache: "reload" });
          if (!response.ok || !response.body) throw new PiperPreparationError("downloadFailed");
          const reader = response.body.getReader();
          const chunks: Uint8Array<ArrayBuffer>[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value.byteLength) resetStall();
            chunks.push(value);
            received[i] += value.byteLength;
            report();
          }
          clearTimeout(timer!);
          const blob = new Blob(chunks);
          const entry = entries[i];
          if (entry && (received[i] !== entry.size || await sha256(await blob.arrayBuffer()) !== entry.sha256)) {
            throw new PiperPreparationError("downloadFailed");
          }
          const headers = new Headers(response.headers);
          // fetch exposes decoded bytes; preserve CORP and other response headers.
          headers.delete("content-encoding");
          headers.set("content-length", String(received[i]));
          try {
            await cache.put(urls[i], new Response(blob, {
              status: response.status, statusText: response.statusText, headers,
            }));
          } catch (error) {
            console.warn("Piper cache write failed; loading voice files from network:", error);
            return false;
          }
        } finally {
          clearTimeout(timer!);
        }
      }
      controller.signal.throwIfAborted();
      // Remove older versions only after every selected-voice file is stored.
      // Other applications on this origin have different prefixes.
      try {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== cacheName)
          .map((name) => caches.delete(name)));
      } catch (error) {
        console.warn("Piper old-cache cleanup unavailable:", error);
      }
      if (sizes.some((size) => size === null)) {
        publish({ voice, downloading: true, loadedBytes: received.reduce((a, b) => a + b, 0),
          totalBytes: received.reduce((a, b) => a + b, 0), error: null });
      }
      return selected;
    } catch (error) {
      if (controller.signal.aborted && !(controller.signal.reason instanceof PiperPreparationError)) {
        throw controller.signal.reason;
      }
      const failure = controller.signal.reason instanceof PiperPreparationError
        ? controller.signal.reason
        : error instanceof PiperPreparationError ? error : new PiperPreparationError("downloadFailed");
      publish({ ...state, downloading: false, error: failure });
      throw failure;
    } finally {
      if (state.voice === voice && state.downloading) publish({ ...state, downloading: false });
    }
  })();
  task = { voice, controller, promise: job };
  void job.finally(() => { if (task?.promise === job) task = null; }).catch(() => undefined);
  return job;
}
