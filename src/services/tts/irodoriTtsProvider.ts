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

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (msg: string | null) => void;
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
    pending.reject(reason);
  }
  pendingRequests.clear();
}

export function isReady(): boolean {
  return ready;
}

export function hasReferenceAudio(): boolean {
  return referenceAudio !== null;
}

export function getReferenceAudioName(): string | null {
  return referenceAudio?.name ?? null;
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./irodoriWorker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const pending = pendingRequests.get(response.id);
    if (!pending) return;

    if (response.type === "progress") {
      pending.onProgress?.(response.message);
      return;
    }

    pendingRequests.delete(response.id);
    if (response.type === "error") {
      pending.reject(new Error(response.message));
      return;
    }

    pending.resolve(response.result);
  };
  worker.onerror = (event) => {
    const err = new Error(event.message || "Irodori Worker error");
    rejectPendingRequests(err);
    worker?.terminate();
    worker = null;
    ready = false;
    initPromise = null;
  };

  return worker;
}

function callWorker<T>(
  message: Record<string, unknown>,
  transfer?: Transferable[],
  onProgress?: (msg: string | null) => void
): Promise<T> {
  const id = nextRequestId++;
  const target = getWorker();

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      onProgress,
    });
    target.postMessage({ id, ...message }, transfer ?? []);
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

  initPromise = (async () => {
    try {
      onProgress?.("Irodori TTS を初期化中...");

      if (!(await isWebGpuSupported())) {
        throw new Error(
          "このブラウザは WebGPU に対応していません。Piper Plus をご利用ください。"
        );
      }

      manifest = await fetchManifest();
      const missingAsset = await findMissingRuntimeAsset(manifest);
      if (missingAsset) {
        throw new Error(
          `Irodori TTS モデルが未ダウンロードです。設定画面からダウンロードしてください。不足: ${missingAsset.path}`
        );
      }

      await callWorker<void>(
        {
          type: "init",
          runtimeUrl: `${getRuntimeBaseUrl()}runtime/pipeline.mjs?v=${encodeURIComponent(
            manifest.version
          )}`,
          baseUrl: getAssetsBaseUrl(),
          manifest,
        },
        undefined,
        onProgress
      );
      await sendReferenceAudioToWorker();

      ready = true;
      onProgress?.(null);
      console.log("TTS(irodori): 初期化完了");
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
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
  if (!worker) return;
  worker.terminate();
  worker = null;
  rejectPendingRequests(new Error("Irodori TTS の生成を中止しました。"));
  manifest = null;
  ready = false;
  initPromise = null;
}

export async function dispose(): Promise<void> {
  if (worker) {
    try {
      await callWorker<void>({ type: "dispose" });
    } catch {
      // terminate below
    }
    worker.terminate();
    worker = null;
  }
  rejectPendingRequests(new Error("Irodori TTS を終了しました。"));
  manifest = null;
  ready = false;
  initPromise = null;
  // 参照音声はセッション内保持のため、エンジン切替では消さない
}
