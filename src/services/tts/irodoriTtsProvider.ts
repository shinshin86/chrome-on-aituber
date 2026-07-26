/**
 * Irodori TTS Provider — WebGPU ベースの高品質 TTS
 *
 * ランタイム本体（pipeline.mjs）と fp16 ONNX モデルはリポジトリに同梱せず、
 * irodoriAssets.ts 経由で明示ダウンロードしたものを使用する。
 *
 * pipeline.mjs に期待するインターフェース（契約）:
 *
 * ```js
 * // <assets base>/runtime/pipeline.mjs
 * export async function createPipeline({ loadAsset, device }) {
 *   // loadAsset(path: string): Promise<ArrayBuffer>
 *   //   manifest.files の path（例 "onnx_fp16/dit.onnx"）を受け取り
 *   //   ブラウザストレージ済みアセットのバイナリを返す
 *   // device: "webgpu"
 *   return {
 *     // referenceAudio: { samples: Float32Array, sampleRate: number }
 *     async synthesize(text, referenceAudio) {
 *       return { audio: Float32Array, sampleRate: number };
 *     },
 *     async dispose() {},
 *   };
 * }
 * ```
 *
 * 参照音声はユーザーがアップロードした .wav / .mp3 を使い、
 * 永続保存せずセッション内（メモリ上）でのみ保持する。
 */

import {
  fetchManifest,
  findMissingRuntimeAsset,
  getAssetsBaseUrl,
  getRuntimeBaseUrl,
  isWebGpuSupported,
  type IrodoriManifest,
} from "./irodoriAssets";

let manifest: IrodoriManifest | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let worker: Worker | null = null;
let nextRequestId = 1;
let initializationGeneration = 0;

const DEFAULT_WORKER_TIMEOUT_MS = 30_000;
const SYNTHESIZE_WORKER_TIMEOUT_MS = 120_000;

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (msg: string | null) => void;
  timeoutId: number;
}

type WorkerResponse =
  | { id: number; type: "success"; result?: unknown }
  | { id: number; type: "error"; message: string }
  | { id: number; type: "progress"; message: string | null };

const pendingRequests = new Map<number, PendingRequest>();

// 参照音声はセッション内のみ保持（永続保存しない）
let referenceAudio: { samples: Float32Array; sampleRate: number; name: string } | null = null;
const IRODORI_SAMPLE_RATE = 48000;

function rejectPendingRequests(reason: Error) {
  for (const pending of pendingRequests.values()) {
    window.clearTimeout(pending.timeoutId);
    pending.reject(reason);
  }
  pendingRequests.clear();
}

function terminateWorker(target: Worker): void {
  target.onmessage = null;
  target.onerror = null;
  target.onmessageerror = null;
  target.terminate();
}

function handleWorkerFailure(target: Worker, reason: Error): void {
  if (worker !== target) return;

  initializationGeneration += 1;
  worker = null;
  terminateWorker(target);
  rejectPendingRequests(reason);
  manifest = null;
  ready = false;
  initPromise = null;
}

export function isReady(): boolean {
  return ready && worker !== null && manifest !== null;
}

export function hasReferenceAudio(): boolean {
  return referenceAudio !== null;
}

export function getReferenceAudioName(): string | null {
  return referenceAudio?.name ?? null;
}

function getWorker(): Worker {
  if (worker) return worker;

  const target = new Worker(new URL("./irodoriWorker.ts", import.meta.url), {
    type: "module",
  });
  worker = target;
  target.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const pending = pendingRequests.get(response.id);
    if (!pending) return;

    if (response.type === "progress") {
      pending.onProgress?.(response.message);
      return;
    }

    pendingRequests.delete(response.id);
    window.clearTimeout(pending.timeoutId);
    if (response.type === "error") {
      pending.reject(new Error(response.message));
      return;
    }

    pending.resolve(response.result);
  };
  target.onerror = (event) => {
    const err = new Error(event.message || "Irodori Worker error");
    handleWorkerFailure(target, err);
  };
  target.onmessageerror = () => {
    handleWorkerFailure(
      target,
      new Error("Irodori Worker message could not be deserialized")
    );
  };

  return target;
}

function callWorker<T>(
  message: Record<string, unknown>,
  transfer?: Transferable[],
  onProgress?: (msg: string | null) => void
): Promise<T> {
  const id = nextRequestId++;
  const target = getWorker();
  const requestType =
    typeof message.type === "string" ? message.type : "unknown";
  const timeoutMs =
    requestType === "synthesize"
      ? SYNTHESIZE_WORKER_TIMEOUT_MS
      : DEFAULT_WORKER_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const pending = pendingRequests.get(id);
      if (!pending) return;

      pendingRequests.delete(id);
      pending.reject(
        new Error(
          `Irodori Worker request timed out after ${timeoutMs / 1000}s (${requestType})`
        )
      );
    }, timeoutMs);

    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      onProgress,
      timeoutId,
    });
    try {
      target.postMessage({ id, ...message }, transfer ?? []);
    } catch (error) {
      window.clearTimeout(timeoutId);
      pendingRequests.delete(id);
      reject(error);
    }
  });
}

async function sendReferenceAudioToWorker(): Promise<void> {
  if (!referenceAudio || !worker) return;
  const samples = new Float32Array(referenceAudio.samples);
  await callWorker<void>(
    {
      type: "setReferenceAudio",
      samples,
      sampleRate: referenceAudio.sampleRate,
    },
    [samples.buffer]
  );
}

async function toMono48k(decoded: AudioBuffer): Promise<Float32Array> {
  if (decoded.sampleRate === IRODORI_SAMPLE_RATE && decoded.numberOfChannels === 1) {
    return new Float32Array(decoded.getChannelData(0));
  }

  const outputLength = Math.max(
    1,
    Math.ceil(decoded.duration * IRODORI_SAMPLE_RATE)
  );
  const offline = new OfflineAudioContext(1, outputLength, IRODORI_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return new Float32Array(rendered.getChannelData(0));
}

/** アップロードされた参照音声を 48kHz mono にデコードし、セッション内に保持する */
export async function setReferenceAudio(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const samples = await toMono48k(decoded);
    referenceAudio = {
      samples,
      sampleRate: IRODORI_SAMPLE_RATE,
      name: file.name,
    };
    await sendReferenceAudioToWorker();
  } finally {
    await ctx.close();
  }
}

export function clearReferenceAudio(): void {
  referenceAudio = null;
  if (worker) {
    void callWorker<void>({ type: "clearReferenceAudio" }).catch(() => {
      // ignore
    });
  }
}

export async function initialize(
  onProgress?: (msg: string | null) => void
): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  const generation = ++initializationGeneration;
  const initialization = (async () => {
    onProgress?.("Irodori TTS を初期化中...");

    if (!(await isWebGpuSupported())) {
      assertCurrentInitialization(generation);
      throw new Error(
        "このブラウザは WebGPU に対応していません。Piper Plus をご利用ください。"
      );
    }
    assertCurrentInitialization(generation);

    const nextManifest = await fetchManifest();
    assertCurrentInitialization(generation);
    manifest = nextManifest;

    const missingAsset = await findMissingRuntimeAsset(nextManifest);
    assertCurrentInitialization(generation);
    if (missingAsset) {
      throw new Error(
        `Irodori TTS モデルが未ダウンロードです。設定画面からダウンロードしてください。不足: ${missingAsset.path}`
      );
    }

    await callWorker<void>(
      {
        type: "init",
        runtimeUrl: `${getRuntimeBaseUrl()}runtime/pipeline.mjs?v=${encodeURIComponent(
          nextManifest.version
        )}`,
        baseUrl: getAssetsBaseUrl(),
        manifest: nextManifest,
      },
      undefined,
      onProgress
    );
    assertCurrentInitialization(generation);

    await sendReferenceAudioToWorker();
    assertCurrentInitialization(generation);

    ready = true;
    onProgress?.(null);
    console.log("TTS(irodori): 初期化完了");
  })();

  initPromise = initialization;
  try {
    await initialization;
  } catch (err) {
    if (initPromise === initialization) {
      initPromise = null;
    }
    throw err;
  }
}

export async function synthesize(
  text: string
): Promise<{ audio: Float32Array; sampleRate: number }> {
  if (!ready) throw new Error("Irodori TTS not initialized");
  if (!referenceAudio) {
    throw new Error(
      "参照音声が未設定です。設定画面から .wav または .mp3 をアップロードしてください。"
    );
  }
  return callWorker<{ audio: Float32Array; sampleRate: number }>({
    type: "synthesize",
    text,
  });
}

export function cancel(): void {
  initializationGeneration += 1;
  const target = worker;
  worker = null;
  if (target) {
    terminateWorker(target);
  }
  rejectPendingRequests(new Error("Irodori TTS の生成を中止しました。"));
  manifest = null;
  ready = false;
  initPromise = null;
}

export async function dispose(): Promise<void> {
  initializationGeneration += 1;
  if (worker) {
    const target = worker;
    try {
      await callWorker<void>({ type: "dispose" });
    } catch {
      // terminate below
    }
    if (worker === target) {
      worker = null;
    }
    terminateWorker(target);
  }
  rejectPendingRequests(new Error("Irodori TTS を終了しました。"));
  manifest = null;
  ready = false;
  initPromise = null;
  // 参照音声はセッション内保持のため、エンジン切替では消さない
}

function assertCurrentInitialization(generation: number): void {
  if (generation !== initializationGeneration) {
    throw new DOMException("Irodori TTS initialization cancelled", "AbortError");
  }
}
