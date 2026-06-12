/**
 * Irodori TTS Assets — manifest 取得、WebGPU 対応チェック、
 * ブラウザストレージへのモデルダウンロードと進捗管理
 *
 * モデル（fp16 ONNX / tokenizer / runtime）はリポジトリに同梱せず、
 * 明示的なユーザー操作でのみダウンロードする。
 * 配信元は VITE_IRODORI_ASSETS_BASE_URL で差し替え可能
 * （未指定時は同一オリジンの `irodori/` 配下）。
 */

export type IrodoriStatus =
  | "checking"
  | "unsupported"
  | "not_downloaded"
  | "downloading"
  | "downloaded"
  | "initializing"
  | "ready"
  | "error";

export interface IrodoriManifestFile {
  path: string;
  size: number;
}

export interface IrodoriManifest {
  version: string;
  variant: string;
  estimatedSizeBytes: number;
  files: IrodoriManifestFile[];
}

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  fileIndex: number;
  fileCount: number;
  currentFile: string;
}

const CACHE_NAME = "irodori-tts-assets";
const DB_NAME = "irodori-tts-assets";
const DB_VERSION = 1;
const STORE_NAME = "files";

interface StoredAsset {
  key: string;
  blob: Blob;
  size: number;
  contentType: string;
  updatedAt: number;
}

export function getAssetsBaseUrl(): string {
  const configured = import.meta.env.VITE_IRODORI_ASSETS_BASE_URL as
    | string
    | undefined;
  const base = configured || `${import.meta.env.BASE_URL}irodori/`;
  return base.endsWith("/") ? base : `${base}/`;
}

/** WebGPU が利用可能か（アダプタ取得まで確認する） */
export async function isWebGpuSupported(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function fetchManifest(): Promise<IrodoriManifest> {
  const url = `${getAssetsBaseUrl()}manifest.json`;
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) {
    throw new Error(
      `Irodori manifest を取得できませんでした (${resp.status})。アセットが配信されているか確認してください。`
    );
  }
  const manifest = (await resp.json()) as IrodoriManifest;
  if (!manifest.version || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Irodori manifest の形式が不正です。");
  }
  return manifest;
}

function cacheKey(version: string, path: string): string {
  // 配信元 URL に依存しないキーにし、配信元を切り替えても再利用できるようにする
  return `https://irodori-assets.local/${version}/${path}`;
}

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("このブラウザは IndexedDB に対応していません。"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB を開けませんでした。"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openAssetDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let request: IDBRequest<T> | void;

        try {
          request = fn(store);
        } catch (err) {
          db.close();
          reject(err);
          return;
        }

        tx.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Irodori アセットの保存に失敗しました。"));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("Irodori アセットの保存が中断されました。"));
        };
      })
  );
}

async function hasStoredAsset(version: string, path: string): Promise<boolean> {
  const key = cacheKey(version, path);
  try {
    const stored = await withStore<StoredAsset>("readonly", (store) => store.get(key));
    if (stored) return true;
  } catch {
    // Cache Storage 互換チェックへ fallback
  }

  if (!("caches" in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(key)) !== undefined;
}

async function putStoredAsset(
  version: string,
  path: string,
  blob: Blob,
  contentType: string
): Promise<void> {
  const asset: StoredAsset = {
    key: cacheKey(version, path),
    blob,
    size: blob.size,
    contentType,
    updatedAt: Date.now(),
  };

  try {
    await withStore<void>("readwrite", (store) => {
      store.put(asset);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Irodori アセットをブラウザに保存できませんでした。空き容量を確認してください: ${path} (${message})`
    );
  }
}

async function getStoredAsset(version: string, path: string): Promise<ArrayBuffer | null> {
  const key = cacheKey(version, path);
  try {
    const stored = await withStore<StoredAsset>("readonly", (store) => store.get(key));
    if (stored) return stored.blob.arrayBuffer();
  } catch {
    // Cache Storage 互換読み出しへ fallback
  }

  if ("caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    if (cached) return cached.arrayBuffer();
  }

  return null;
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB の削除に失敗しました。"));
    req.onblocked = () => resolve();
  });
}

/** manifest の全ファイルがブラウザストレージに揃っているか */
export async function isDownloaded(manifest: IrodoriManifest): Promise<boolean> {
  for (const file of manifest.files) {
    if (!(await hasStoredAsset(manifest.version, file.path))) return false;
  }
  return true;
}

/**
 * manifest の全ファイルをダウンロードしてブラウザストレージに保存する。
 * すでに保存済みのファイルはスキップする（中断後の再開に対応）。
 */
export async function downloadAssets(
  manifest: IrodoriManifest,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!("indexedDB" in window)) {
    throw new Error("このブラウザは IndexedDB に対応していません。");
  }

  const baseUrl = getAssetsBaseUrl();
  const totalBytes = manifest.files.reduce((sum, f) => sum + (f.size || 0), 0);
  let loadedBytes = 0;

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];

    if (await hasStoredAsset(manifest.version, file.path)) {
      loadedBytes += file.size || 0;
      onProgress?.({
        loadedBytes,
        totalBytes,
        fileIndex: i + 1,
        fileCount: manifest.files.length,
        currentFile: file.path,
      });
      continue;
    }

    const resp = await fetch(`${baseUrl}${file.path}`, { signal });
    if (!resp.ok || !resp.body) {
      throw new Error(`ダウンロードに失敗しました: ${file.path} (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let fileLoaded = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      fileLoaded += value.byteLength;
      onProgress?.({
        loadedBytes: loadedBytes + fileLoaded,
        totalBytes,
        fileIndex: i + 1,
        fileCount: manifest.files.length,
        currentFile: file.path,
      });
    }

    const blob = new Blob(chunks as BlobPart[]);
    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    await putStoredAsset(manifest.version, file.path, blob, contentType);

    loadedBytes += fileLoaded;
  }
}

/** ダウンロード済みアセットを削除して容量を解放する */
export async function deleteAssets(): Promise<void> {
  await Promise.all([
    "caches" in window ? caches.delete(CACHE_NAME) : Promise.resolve(false),
    deleteIndexedDb(DB_NAME),
  ]);
}

/**
 * ブラウザストレージからアセットを読み出す（ランタイム連携用）。
 * 見つからない場合は配信元から直接取得する。
 */
export async function loadAsset(
  manifest: IrodoriManifest,
  path: string
): Promise<ArrayBuffer> {
  const stored = await getStoredAsset(manifest.version, path);
  if (stored) return stored;

  const resp = await fetch(`${getAssetsBaseUrl()}${path}`);
  if (!resp.ok) {
    throw new Error(`Irodori アセットを取得できませんでした: ${path}`);
  }
  return resp.arrayBuffer();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "不明";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
