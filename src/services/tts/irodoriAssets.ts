/**
 * Irodori TTS Assets — manifest 取得、WebGPU 対応チェック、
 * Cache Storage へのモデルダウンロードと進捗管理
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

/** manifest の全ファイルが Cache Storage に揃っているか */
export async function isDownloaded(manifest: IrodoriManifest): Promise<boolean> {
  if (!("caches" in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  for (const file of manifest.files) {
    const match = await cache.match(cacheKey(manifest.version, file.path));
    if (!match) return false;
  }
  return true;
}

/**
 * manifest の全ファイルをダウンロードして Cache Storage に保存する。
 * すでにキャッシュ済みのファイルはスキップする（中断後の再開に対応）。
 */
export async function downloadAssets(
  manifest: IrodoriManifest,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!("caches" in window)) {
    throw new Error("このブラウザは Cache Storage に対応していません。");
  }

  const cache = await caches.open(CACHE_NAME);
  const baseUrl = getAssetsBaseUrl();
  const totalBytes = manifest.files.reduce((sum, f) => sum + (f.size || 0), 0);
  let loadedBytes = 0;

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    const key = cacheKey(manifest.version, file.path);

    const cached = await cache.match(key);
    if (cached) {
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
    await cache.put(
      key,
      new Response(blob, { headers: { "content-type": contentType } })
    );

    loadedBytes += fileLoaded;
  }
}

/** ダウンロード済みアセットを削除して容量を解放する */
export async function deleteAssets(): Promise<void> {
  if (!("caches" in window)) return;
  await caches.delete(CACHE_NAME);
}

/**
 * Cache Storage からアセットを読み出す（ランタイム連携用）。
 * 見つからない場合は配信元から直接取得する。
 */
export async function loadAsset(
  manifest: IrodoriManifest,
  path: string
): Promise<ArrayBuffer> {
  if ("caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey(manifest.version, path));
    if (cached) return cached.arrayBuffer();
  }
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
