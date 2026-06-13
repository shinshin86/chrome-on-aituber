const CACHE_NAME = "irodori-tts-assets";
const DB_NAME = "irodori-tts-assets";
const DB_VERSION = 3;
const STORE_NAME = "files";
const CHUNK_STORE_NAME = "chunks";
const OPFS_DIR_NAME = "irodori-tts-assets";
const LARGE_ASSET_CHUNK_BYTES = 1024 * 1024;

interface OpfsFileHandle {
  createWritable(): Promise<{
    close(): Promise<void>;
    write(data: BufferSource | Blob | string): Promise<void>;
  }>;
  getFile(): Promise<File>;
}

interface OpfsDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<OpfsDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<OpfsFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

interface StoredAsset {
  key: string;
  blob?: Blob;
  size: number;
  contentType: string;
  updatedAt: number;
  chunked?: boolean;
  chunkCount?: number;
}

interface StoredAssetChunk {
  key: string;
  assetKey: string;
  index: number;
  buffer: ArrayBuffer;
}

type GlobalWithStorage = typeof globalThis & {
  caches?: CacheStorage;
  indexedDB?: IDBFactory;
  navigator?: Navigator & {
    storage?: {
      getDirectory?: () => Promise<OpfsDirectoryHandle>;
    };
  };
};

function storageGlobal(): GlobalWithStorage {
  return globalThis as GlobalWithStorage;
}

function describeStorageError(err: unknown): string {
  if (err instanceof DOMException) {
    return `${err.name}${err.message ? `: ${err.message}` : ""}`;
  }
  if (err instanceof Error) {
    return `${err.name}${err.message ? `: ${err.message}` : ""}`;
  }
  return String(err);
}

function formatStorageSaveError(path: string, message: string): Error {
  const quotaHint = message.includes("QuotaExceededError")
    ? " シークレットウィンドウでは保存上限が通常より小さくなることがあります。通常ウィンドウで開くか、Chrome のサイトデータを削除してから再試行してください。"
    : "";
  return new Error(
    `Irodori アセットをブラウザに保存できませんでした。空き容量を確認してください: ${path} (${message})${quotaHint}`
  );
}

function opfsAvailable(): boolean {
  return typeof storageGlobal().navigator?.storage?.getDirectory === "function";
}

async function getOpfsRoot(): Promise<OpfsDirectoryHandle | null> {
  const storage = storageGlobal().navigator?.storage;
  if (!storage?.getDirectory) return null;
  return storage.getDirectory();
}

async function getOpfsAssetDirectory(
  version: string,
  path: string,
  create: boolean
): Promise<{ directory: OpfsDirectoryHandle; fileName: string } | null> {
  const root = await getOpfsRoot();
  if (!root) return null;

  let directory = await root.getDirectoryHandle(OPFS_DIR_NAME, { create });
  directory = await directory.getDirectoryHandle(encodeURIComponent(version), {
    create,
  });

  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create });
  }

  return { directory, fileName };
}

async function getOpfsAssetFile(
  version: string,
  path: string,
  create: boolean
): Promise<OpfsFileHandle | null> {
  try {
    const target = await getOpfsAssetDirectory(version, path, create);
    if (!target) return null;
    return target.directory.getFileHandle(target.fileName, { create });
  } catch {
    return null;
  }
}

export function irodoriAssetKey(version: string, path: string): string {
  // 配信元 URL に依存しないキーにし、配信元を切り替えても再利用できるようにする
  return `https://irodori-assets.local/${version}/${path}`;
}

function irodoriAssetCacheChunkKey(assetKey: string, index: number): string {
  return `${assetKey}?chunk=${index}`;
}

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = storageGlobal().indexedDB;
    if (!idb) {
      reject(new Error("このブラウザは IndexedDB に対応していません。"));
      return;
    }

    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion > 0 && event.oldVersion < 3) {
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        if (db.objectStoreNames.contains(CHUNK_STORE_NAME)) {
          db.deleteObjectStore(CHUNK_STORE_NAME);
        }
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE_NAME)) {
        const chunks = db.createObjectStore(CHUNK_STORE_NAME, { keyPath: "key" });
        chunks.createIndex("assetKey", "assetKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB を開けませんでした。"));
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openAssetDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
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

export async function hasStoredAsset(
  version: string,
  path: string,
  expectedSize?: number
): Promise<boolean> {
  const opfsFile = await getOpfsAssetFile(version, path, false);
  if (opfsFile) {
    const file = await opfsFile.getFile();
    return expectedSize === undefined || file.size === expectedSize;
  }

  const key = irodoriAssetKey(version, path);
  try {
    const stored = await withStore<StoredAsset>(STORE_NAME, "readonly", (store) =>
      store.get(key)
    );
    if (stored) {
      return expectedSize === undefined || stored.size === expectedSize;
    }
  } catch {
    // Cache Storage 互換チェックへ fallback
  }

  const cacheStorage = storageGlobal().caches;
  if (!cacheStorage) return false;
  const cache = await cacheStorage.open(CACHE_NAME);
  const cached = await cache.match(key);
  if (!cached) return false;
  if (expectedSize === undefined) return true;

  const contentLength = cached.headers.get("content-length");
  if (contentLength) return Number(contentLength) === expectedSize;
  const blob = await cached.blob();
  return blob.size === expectedSize;
}

async function putAssetMetadata(asset: StoredAsset): Promise<void> {
  await withStore<void>(STORE_NAME, "readwrite", (store) => {
    store.put(asset);
  });
}

async function putAssetChunk(chunk: StoredAssetChunk): Promise<void> {
  await withStore<void>(CHUNK_STORE_NAME, "readwrite", (store) => {
    store.put(chunk);
  });
}

function getAssetChunks(
  assetKey: string,
  chunkCount: number
): Promise<ArrayBuffer[] | null> {
  return openAssetDb().then(
    (db) =>
      new Promise<ArrayBuffer[] | null>((resolve, reject) => {
        const tx = db.transaction(CHUNK_STORE_NAME, "readonly");
        const store = tx.objectStore(CHUNK_STORE_NAME);
        const buffers = new Array<ArrayBuffer>(chunkCount);
        let missing = false;

        for (let index = 0; index < chunkCount; index += 1) {
          const req = store.get(`${assetKey}#${index}`);
          req.onsuccess = () => {
            const chunk = req.result as StoredAssetChunk | undefined;
            if (!chunk?.buffer) {
              missing = true;
              return;
            }
            buffers[index] = chunk.buffer;
          };
          req.onerror = () => {
            missing = true;
          };
        }

        tx.oncomplete = () => {
          db.close();
          resolve(missing ? null : buffers);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Irodori アセットの読み込みに失敗しました。"));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("Irodori アセットの読み込みが中断されました。"));
        };
      })
  );
}

export async function putStoredAsset(
  version: string,
  path: string,
  blob: Blob,
  contentType: string
): Promise<void> {
  const key = irodoriAssetKey(version, path);
  const asset: StoredAsset = {
    key,
    blob,
    size: blob.size,
    contentType,
    updatedAt: Date.now(),
  };

  try {
    if (blob.size <= LARGE_ASSET_CHUNK_BYTES) {
      await putAssetMetadata(asset);
      return;
    }

    const chunkCount = Math.ceil(blob.size / LARGE_ASSET_CHUNK_BYTES);
    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * LARGE_ASSET_CHUNK_BYTES;
      const end = Math.min(blob.size, start + LARGE_ASSET_CHUNK_BYTES);
      await putAssetChunk({
        key: `${key}#${index}`,
        assetKey: key,
        index,
        buffer: await blob.slice(start, end).arrayBuffer(),
      });
    }
    await putAssetMetadata({
      key,
      size: blob.size,
      contentType,
      updatedAt: Date.now(),
      chunked: true,
      chunkCount,
    });
  } catch (err) {
    const message = describeStorageError(err);
    throw formatStorageSaveError(path, message);
  }
}

export async function putStoredAssetFromParts(
  version: string,
  path: string,
  parts: Uint8Array[],
  size: number,
  contentType: string
): Promise<void> {
  const key = irodoriAssetKey(version, path);

  try {
    if (size <= LARGE_ASSET_CHUNK_BYTES) {
      await putAssetMetadata({
        key,
        blob: new Blob(parts as BlobPart[], { type: contentType }),
        size,
        contentType,
        updatedAt: Date.now(),
      });
      return;
    }

    let index = 0;
    let offset = 0;
    let buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);

    async function flush(final = false) {
      if (offset === 0) return;
      const chunkBuffer = final
        ? buffer.buffer.slice(0, offset)
        : buffer.buffer;
      await putAssetChunk({
        key: `${key}#${index}`,
        assetKey: key,
        index,
        buffer: chunkBuffer,
      });
      index += 1;
      offset = 0;
      buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);
    }

    for (const part of parts) {
      let readOffset = 0;
      while (readOffset < part.byteLength) {
        const writable = Math.min(
          LARGE_ASSET_CHUNK_BYTES - offset,
          part.byteLength - readOffset
        );
        buffer.set(part.subarray(readOffset, readOffset + writable), offset);
        offset += writable;
        readOffset += writable;
        if (offset === LARGE_ASSET_CHUNK_BYTES) {
          await flush();
        }
      }
    }
    await flush(true);

    await putAssetMetadata({
      key,
      size,
      contentType,
      updatedAt: Date.now(),
      chunked: true,
      chunkCount: index,
    });
  } catch (err) {
    const message = describeStorageError(err);
    throw formatStorageSaveError(path, message);
  }
}

export async function putStoredAssetFromStream(
  version: string,
  path: string,
  stream: ReadableStream<Uint8Array>,
  size: number,
  contentType: string,
  onProgress?: (loadedBytes: number) => void
): Promise<number> {
  if (!storageGlobal().indexedDB && storageGlobal().caches) {
    return putStoredAssetFromStreamToCache(
      version,
      path,
      stream,
      size,
      contentType,
      onProgress
    );
  }

  if (!storageGlobal().indexedDB && opfsAvailable()) {
    return putStoredAssetFromStreamToOpfs(
      version,
      path,
      stream,
      size,
      contentType,
      onProgress
    );
  }

  const key = irodoriAssetKey(version, path);
  const reader = stream.getReader();
  let loadedBytes = 0;

  try {
    if (size <= LARGE_ASSET_CHUNK_BYTES) {
      const parts: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        loadedBytes += value.byteLength;
        onProgress?.(loadedBytes);
      }
      await putAssetMetadata({
        key,
        blob: new Blob(parts as BlobPart[], { type: contentType }),
        size: loadedBytes,
        contentType,
        updatedAt: Date.now(),
      });
      return loadedBytes;
    }

    let index = 0;
    let offset = 0;
    let lastProgressBytes = 0;
    let buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);

    async function flush(final = false) {
      if (offset === 0) return;
      const chunkBuffer = final ? buffer.buffer.slice(0, offset) : buffer.buffer;
      await putAssetChunk({
        key: `${key}#${index}`,
        assetKey: key,
        index,
        buffer: chunkBuffer,
      });
      index += 1;
      offset = 0;
      buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);
    }

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      let readOffset = 0;
      while (readOffset < value.byteLength) {
        const writable = Math.min(
          LARGE_ASSET_CHUNK_BYTES - offset,
          value.byteLength - readOffset
        );
        buffer.set(value.subarray(readOffset, readOffset + writable), offset);
        offset += writable;
        readOffset += writable;
        if (offset === LARGE_ASSET_CHUNK_BYTES) {
          await flush();
        }
      }
      loadedBytes += value.byteLength;
      if (loadedBytes - lastProgressBytes >= LARGE_ASSET_CHUNK_BYTES) {
        lastProgressBytes = loadedBytes;
        onProgress?.(loadedBytes);
      }
    }
    await flush(true);
    if (loadedBytes !== lastProgressBytes) {
      onProgress?.(loadedBytes);
    }

    await putAssetMetadata({
      key,
      size: loadedBytes,
      contentType,
      updatedAt: Date.now(),
      chunked: true,
      chunkCount: index,
    });
    return loadedBytes;
  } catch (err) {
    const message = describeStorageError(err);
    throw formatStorageSaveError(path, message);
  } finally {
    reader.releaseLock();
  }
}

async function putStoredAssetFromStreamToCache(
  version: string,
  path: string,
  stream: ReadableStream<Uint8Array>,
  size: number,
  contentType: string,
  onProgress?: (loadedBytes: number) => void
): Promise<number> {
  const cacheStorage = storageGlobal().caches;
  if (!cacheStorage) {
    throw new Error("このブラウザは Cache Storage に対応していません。");
  }

  const key = irodoriAssetKey(version, path);
  const cache = await cacheStorage.open(CACHE_NAME);
  const reader = stream.getReader();
  let loadedBytes = 0;
  let lastProgressBytes = 0;
  let index = 0;
  let offset = 0;
  let buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);

  async function flush(final = false) {
    if (offset === 0) return;
    const chunkBuffer = final ? buffer.buffer.slice(0, offset) : buffer.buffer;
    await cache.put(
      irodoriAssetCacheChunkKey(key, index),
      new Response(chunkBuffer, {
        headers: { "content-type": "application/octet-stream" },
      })
    );
    index += 1;
    offset = 0;
    buffer = new Uint8Array(LARGE_ASSET_CHUNK_BYTES);
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      let readOffset = 0;
      while (readOffset < value.byteLength) {
        const writable = Math.min(
          LARGE_ASSET_CHUNK_BYTES - offset,
          value.byteLength - readOffset
        );
        buffer.set(value.subarray(readOffset, readOffset + writable), offset);
        offset += writable;
        readOffset += writable;
        if (offset === LARGE_ASSET_CHUNK_BYTES) {
          await flush();
        }
      }
      loadedBytes += value.byteLength;
      if (loadedBytes - lastProgressBytes >= LARGE_ASSET_CHUNK_BYTES) {
        lastProgressBytes = loadedBytes;
        onProgress?.(loadedBytes);
      }
    }
    await flush(true);
    if (loadedBytes !== lastProgressBytes) {
      onProgress?.(loadedBytes);
    }
    if (size > 0 && loadedBytes !== size) {
      throw new Error(`サイズが一致しません: expected=${size} actual=${loadedBytes}`);
    }
    await putAssetMetadata({
      key,
      size: loadedBytes,
      contentType,
      updatedAt: Date.now(),
      chunked: true,
      chunkCount: index,
    });
    return loadedBytes;
  } catch (err) {
    const message = describeStorageError(err);
    throw formatStorageSaveError(path, message);
  } finally {
    reader.releaseLock();
  }
}

async function putStoredAssetFromStreamToOpfs(
  version: string,
  path: string,
  stream: ReadableStream<Uint8Array>,
  size: number,
  _contentType: string,
  onProgress?: (loadedBytes: number) => void
): Promise<number> {
  const fileHandle = await getOpfsAssetFile(version, path, true);
  if (!fileHandle) {
    throw new Error("このブラウザは OPFS に対応していません。");
  }

  const reader = stream.getReader();
  const writable = await fileHandle.createWritable();
  let loadedBytes = 0;
  let lastProgressBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const writableValue = new Uint8Array(value.byteLength);
      writableValue.set(value);
      await writable.write(writableValue.buffer);
      loadedBytes += value.byteLength;
      if (loadedBytes - lastProgressBytes >= LARGE_ASSET_CHUNK_BYTES) {
        lastProgressBytes = loadedBytes;
        onProgress?.(loadedBytes);
      }
    }

    await writable.close();
    if (loadedBytes !== lastProgressBytes) {
      onProgress?.(loadedBytes);
    }
    if (size > 0 && loadedBytes !== size) {
      throw new Error(`サイズが一致しません: expected=${size} actual=${loadedBytes}`);
    }
    return loadedBytes;
  } catch (err) {
    try {
      await writable.close();
    } catch {
      // ignore close errors after a failed write
    }
    const message = describeStorageError(err);
    throw formatStorageSaveError(path, message);
  } finally {
    reader.releaseLock();
  }
}

export async function getStoredAsset(
  version: string,
  path: string
): Promise<ArrayBuffer | null> {
  const opfsFile = await getOpfsAssetFile(version, path, false);
  if (opfsFile) {
    try {
      const file = await opfsFile.getFile();
      return await file.arrayBuffer();
    } catch (err) {
      console.warn(
        `Irodori アセットの OPFS 読み出しに失敗しました（fallback します）: ${path}`,
        describeStorageError(err)
      );
    }
  }

  const key = irodoriAssetKey(version, path);
  try {
    const stored = await withStore<StoredAsset>(STORE_NAME, "readonly", (store) =>
      store.get(key)
    );
    // Chrome は 64KB 超の IndexedDB 値を外部ファイル化するため、保存成功後でも
    // 読み出し時に NotReadableError / "Failed to read large IndexedDB value" に
    // なることがある。reject を必ず catch に入れて fallback へ流す。
    if (stored?.blob) return await stored.blob.arrayBuffer();
    if (stored?.chunked && stored.chunkCount) {
      const cacheStorage = storageGlobal().caches;
      const cache = cacheStorage ? await cacheStorage.open(CACHE_NAME) : null;
      let buffers = await getAssetChunks(key, stored.chunkCount);
      if (!buffers && cache) {
        buffers = [];
        for (let index = 0; index < stored.chunkCount; index += 1) {
          const cached = await cache.match(irodoriAssetCacheChunkKey(key, index));
          if (!cached) return null;
          buffers.push(await cached.arrayBuffer());
        }
      }
      if (!buffers) return null;

      const total = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const buffer of buffers) {
        bytes.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }
      return bytes.buffer;
    }
  } catch (err) {
    // Cache Storage 互換読み出しへ fallback
    console.warn(
      `Irodori アセットのストレージ読み出しに失敗しました（fallback します）: ${path}`,
      describeStorageError(err)
    );
  }

  const cacheStorage = storageGlobal().caches;
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(CACHE_NAME);
      const cached = await cache.match(key);
      if (cached) return await cached.arrayBuffer();
    } catch (err) {
      console.warn(
        `Irodori アセットの Cache Storage 読み出しに失敗しました: ${path}`,
        describeStorageError(err)
      );
    }
  }

  return null;
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const idb = storageGlobal().indexedDB;
    if (!idb) {
      resolve();
      return;
    }
    const req = idb.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB の削除に失敗しました。"));
    req.onblocked = () => resolve();
  });
}

export async function deleteStoredAssets(): Promise<void> {
  const cacheStorage = storageGlobal().caches;
  const opfsRoot = await getOpfsRoot();
  await Promise.all([
    cacheStorage ? cacheStorage.delete(CACHE_NAME) : Promise.resolve(false),
    deleteIndexedDb(DB_NAME),
    opfsRoot
      ? opfsRoot.removeEntry(OPFS_DIR_NAME, { recursive: true }).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
}

export function hasIndexedDbStorage(): boolean {
  return Boolean(storageGlobal().indexedDB || opfsAvailable());
}
