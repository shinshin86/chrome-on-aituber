import {
  findMissingRuntimeAsset,
  loadAsset as loadManifestAsset,
  type IrodoriManifest,
} from "./irodoriAssets";

interface IrodoriPipeline {
  synthesize(
    text: string,
    referenceAudio: { samples: Float32Array; sampleRate: number }
  ): Promise<{ audio: Float32Array; sampleRate: number }>;
  dispose?(): Promise<void> | void;
}

interface IrodoriRuntimeModule {
  createPipeline?: (options: unknown) => Promise<IrodoriPipeline>;
}

type WorkerRequest =
  | {
      id: number;
      type: "init";
      runtimeUrl: string;
      baseUrl: string;
      manifest: IrodoriManifest;
    }
  | {
      id: number;
      type: "setReferenceAudio";
      samples: Float32Array;
      sampleRate: number;
    }
  | { id: number; type: "clearReferenceAudio" }
  | { id: number; type: "synthesize"; text: string }
  | { id: number; type: "dispose" };

type WorkerResponse =
  | { id: number; type: "success"; result?: unknown }
  | { id: number; type: "error"; message: string }
  | { id: number; type: "progress"; message: string | null };

const workerSelf = globalThis as unknown as {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerRequest>) => void
  ): void;
};

let manifest: IrodoriManifest | null = null;
let pipeline: IrodoriPipeline | null = null;
let referenceAudio: { samples: Float32Array; sampleRate: number } | null = null;
let assetsBaseUrl = "";
const MAX_SYNTH_SECONDS = 8;

function postSuccess(id: number, result?: unknown, transfer?: Transferable[]) {
  workerSelf.postMessage({ id, type: "success", result }, transfer);
}

function postProgress(id: number, message: string | null) {
  workerSelf.postMessage({ id, type: "progress", message });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function importRuntime(url: string): Promise<IrodoriRuntimeModule> {
  const importer = new Function("url", "return import(url);") as (
    url: string
  ) => Promise<IrodoriRuntimeModule>;
  return importer(url);
}

async function loadAsset(path: string): Promise<ArrayBuffer> {
  if (!manifest) throw new Error("Irodori manifest is not initialized.");
  return loadManifestAsset(manifest, path, assetsBaseUrl);
}

async function handleInit(
  id: number,
  runtimeUrl: string,
  baseUrl: string,
  initManifest: IrodoriManifest
) {
  postProgress(id, "Irodori TTS を初期化中...");

  const gpu = (globalThis.navigator as Navigator & {
    gpu?: { requestAdapter(): Promise<unknown | null> };
  }).gpu;
  if (!gpu || !(await gpu.requestAdapter())) {
    throw new Error(
      "このブラウザは Worker 内 WebGPU に対応していません。Piper Plus をご利用ください。"
    );
  }

  assetsBaseUrl = baseUrl;
  manifest = initManifest;
  const missingAsset = await findMissingRuntimeAsset(manifest);
  if (missingAsset) {
    throw new Error(
      `Irodori TTS モデルが未ダウンロードです。設定画面からダウンロードしてください。不足: ${missingAsset.path}`
    );
  }

  postProgress(id, "Irodori ランタイムを読み込み中...");
  const runtime = await importRuntime(runtimeUrl);
  if (typeof runtime.createPipeline !== "function") {
    throw new Error("Irodori ランタイムに createPipeline がエクスポートされていません。");
  }

  postProgress(id, "Irodori モデルを準備中...");
  pipeline = await runtime.createPipeline({
    loadAsset,
    device: "webgpu",
    maxSeconds: MAX_SYNTH_SECONDS,
  });

  postProgress(id, null);
}

async function handleDispose() {
  try {
    await pipeline?.dispose?.();
  } finally {
    pipeline = null;
    manifest = null;
  }
}

workerSelf.addEventListener("message", (event) => {
  const message = event.data;

  void (async () => {
    try {
      switch (message.type) {
        case "init":
          await handleInit(
            message.id,
            message.runtimeUrl,
            message.baseUrl,
            message.manifest
          );
          postSuccess(message.id);
          return;
        case "setReferenceAudio":
          referenceAudio = {
            samples: message.samples,
            sampleRate: message.sampleRate,
          };
          postSuccess(message.id);
          return;
        case "clearReferenceAudio":
          referenceAudio = null;
          postSuccess(message.id);
          return;
        case "synthesize": {
          if (!pipeline) throw new Error("Irodori TTS not initialized");
          if (!referenceAudio) {
            throw new Error(
              "参照音声が未設定です。設定画面から .wav をアップロードしてください。"
            );
          }

          postProgress(message.id, "Irodori TTS で音声を生成中...");
          const result = await pipeline.synthesize(message.text, referenceAudio);
          postSuccess(message.id, result, [result.audio.buffer]);
          return;
        }
        case "dispose":
          await handleDispose();
          postSuccess(message.id);
          return;
      }
    } catch (err) {
      workerSelf.postMessage({
        id: message.id,
        type: "error",
        message: errorMessage(err),
      });
    }
  })();
});
