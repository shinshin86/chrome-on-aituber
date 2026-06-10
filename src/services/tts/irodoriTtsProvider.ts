/**
 * Irodori TTS Provider — WebGPU ベースの高品質 TTS（fp16 のみ対応）
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
 *   //   Cache Storage 済みアセットのバイナリを返す
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
 * 参照音声はユーザーがアップロードした .wav のみを使い、
 * 永続保存せずセッション内（メモリ上）でのみ保持する。
 */

import {
  fetchManifest,
  getAssetsBaseUrl,
  isDownloaded,
  isWebGpuSupported,
  loadAsset,
  type IrodoriManifest,
} from "./irodoriAssets";

interface IrodoriPipeline {
  synthesize(
    text: string,
    referenceAudio: { samples: Float32Array; sampleRate: number }
  ): Promise<{ audio: Float32Array; sampleRate: number }>;
  dispose?(): Promise<void> | void;
}

let pipeline: IrodoriPipeline | null = null;
let manifest: IrodoriManifest | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;

// 参照音声はセッション内のみ保持（永続保存しない）
let referenceAudio: { samples: Float32Array; sampleRate: number; name: string } | null = null;

export function isReady(): boolean {
  return ready;
}

export function hasReferenceAudio(): boolean {
  return referenceAudio !== null;
}

export function getReferenceAudioName(): string | null {
  return referenceAudio?.name ?? null;
}

/** アップロードされた .wav をデコードし、セッション内に保持する */
export async function setReferenceAudio(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    referenceAudio = {
      samples: new Float32Array(decoded.getChannelData(0)),
      sampleRate: decoded.sampleRate,
      name: file.name,
    };
  } finally {
    await ctx.close();
  }
}

export function clearReferenceAudio(): void {
  referenceAudio = null;
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
      if (!(await isDownloaded(manifest))) {
        throw new Error(
          "Irodori TTS モデルが未ダウンロードです。設定画面からダウンロードしてください。"
        );
      }

      onProgress?.("Irodori ランタイムを読み込み中...");
      const runtimeUrl = `${getAssetsBaseUrl()}runtime/pipeline.mjs`;
      let runtime: { createPipeline?: (options: unknown) => Promise<IrodoriPipeline> };
      try {
        runtime = await import(/* @vite-ignore */ runtimeUrl);
      } catch {
        throw new Error(
          "Irodori ランタイム (runtime/pipeline.mjs) を読み込めませんでした。アセットの配置を確認してください。"
        );
      }
      if (typeof runtime.createPipeline !== "function") {
        throw new Error(
          "Irodori ランタイムに createPipeline がエクスポートされていません。"
        );
      }

      onProgress?.("Irodori モデルを準備中...");
      const currentManifest = manifest;
      pipeline = await runtime.createPipeline({
        loadAsset: (path: string) => loadAsset(currentManifest, path),
        device: "webgpu",
      });

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
  if (!ready || !pipeline) throw new Error("Irodori TTS not initialized");
  if (!referenceAudio) {
    throw new Error(
      "参照音声が未設定です。設定画面から .wav をアップロードしてください。"
    );
  }
  return pipeline.synthesize(text, {
    samples: referenceAudio.samples,
    sampleRate: referenceAudio.sampleRate,
  });
}

export async function dispose(): Promise<void> {
  if (pipeline) {
    try {
      await pipeline.dispose?.();
    } catch {
      // ignore
    }
    pipeline = null;
  }
  manifest = null;
  ready = false;
  initPromise = null;
  // 参照音声はセッション内保持のため、エンジン切替では消さない
}
