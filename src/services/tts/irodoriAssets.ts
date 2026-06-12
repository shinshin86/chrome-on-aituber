/**
 * Irodori TTS Assets — manifest 取得、WebGPU 対応チェック、
 * ブラウザストレージへのモデルダウンロードと進捗管理
 *
 * モデル（fp16 ONNX / tokenizer / runtime）はリポジトリに同梱せず、
 * 明示的なユーザー操作でのみダウンロードする。
 * 配信元は VITE_IRODORI_ASSETS_BASE_URL で差し替え可能
 * （未指定時は同一オリジンの `irodori/` 配下）。
 */

import {
  deleteStoredAssets,
  getStoredAsset,
  hasIndexedDbStorage,
  hasStoredAsset,
  putStoredAsset,
  putStoredAssetFromStream,
} from "./irodoriAssetStore";

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

/** manifest の全ファイルがブラウザストレージに揃っているか */
export async function isDownloaded(manifest: IrodoriManifest): Promise<boolean> {
  for (const file of manifest.files) {
    if (!(await hasStoredAsset(manifest.version, file.path, file.size))) return false;
  }
  return true;
}

function isRuntimeRequiredAsset(path: string): boolean {
  return (
    path === "runtime/pipeline.mjs" ||
    path.startsWith("onnx_fp16/") ||
    path.startsWith("tokenizer/")
  );
}

export async function findMissingRuntimeAsset(
  manifest: IrodoriManifest
): Promise<IrodoriManifestFile | null> {
  for (const file of manifest.files) {
    if (!isRuntimeRequiredAsset(file.path)) continue;
    if (!(await hasStoredAsset(manifest.version, file.path, file.size))) {
      return file;
    }
  }
  return null;
}

export async function isRuntimeDownloaded(
  manifest: IrodoriManifest
): Promise<boolean> {
  return (await findMissingRuntimeAsset(manifest)) === null;
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
  if (!hasIndexedDbStorage()) {
    throw new Error("このブラウザは IndexedDB に対応していません。");
  }
  await navigator.storage?.persist?.().catch(() => false);

  const baseUrl = getAssetsBaseUrl();
  const totalBytes = manifest.files.reduce((sum, f) => sum + (f.size || 0), 0);
  let loadedBytes = 0;

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];

    if (await hasStoredAsset(manifest.version, file.path, file.size)) {
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

    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    const fileLoaded = await putStoredAssetFromStream(
      manifest.version,
      file.path,
      resp.body,
      file.size,
      contentType,
      (currentFileLoaded) => {
        onProgress?.({
          loadedBytes: loadedBytes + currentFileLoaded,
          totalBytes,
          fileIndex: i + 1,
          fileCount: manifest.files.length,
          currentFile: file.path,
        });
      }
    );

    loadedBytes += fileLoaded;
  }
}

/** ダウンロード済みアセットを削除して容量を解放する */
export async function deleteAssets(): Promise<void> {
  await deleteStoredAssets();
}

/**
 * ブラウザストレージからアセットを読み出す（ランタイム連携用）。
 * 保存値が見つからない・読めない場合は配信元から直接取得し、
 * 次回以降のためにストレージへ保存し直す（self-healing）。
 * baseUrl は Worker など getAssetsBaseUrl() を使えない文脈で上書きする。
 */
export async function loadAsset(
  manifest: IrodoriManifest,
  path: string,
  baseUrl: string = getAssetsBaseUrl()
): Promise<ArrayBuffer> {
  const stored = await getStoredAsset(manifest.version, path);
  if (stored) return stored;

  const resp = await fetch(`${baseUrl}${path}`);
  if (!resp.ok) {
    throw new Error(`Irodori アセットを取得できませんでした: ${path}`);
  }
  const blob = await resp.blob();
  const contentType =
    resp.headers.get("content-type") ?? "application/octet-stream";
  try {
    await putStoredAsset(manifest.version, path, blob, contentType);
  } catch (err) {
    // 保存し直しは次回起動の高速化のためで、今回の合成には影響しない
    console.warn(`Irodori アセットの再保存に失敗しました: ${path}`, err);
  }
  return blob.arrayBuffer();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "不明";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
