/**
 * Piper Plus TTS Provider — piper-plus WASM + ONNX Runtime
 *
 * piper-plus の JS モジュール群は ES module (import/export) で書かれている。
 * Vite ビルドに含めると WASM 周りの問題が起きるため、
 * public/ に配置した JS/WASM を動的に読み込む。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let phonemizer: any = null;
let onnxSession: any = null;
let modelConfig: any = null;
let ready = false;
let initPromise: Promise<void> | null = null;

// ort は public/piper/dist/ort.min.js で <script> ロードされる想定
declare const ort: any;

export function isReady(): boolean {
  return ready;
}

export async function initialize(
  onProgress?: (msg: string | null) => void
): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      onProgress?.("音声エンジンを初期化中...");

      const base = import.meta.env.BASE_URL;

      // ONNX Runtime 設定
      ort.env.wasm.wasmPaths = `${base}piper/dist/`;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      // モデル設定読み込み
      onProgress?.("モデル設定を読み込み中...");
      const configResp = await fetch(`${base}piper/models/tsukuyomi-config.json`);
      modelConfig = await configResp.json();

      // OpenJTalk Phonemizer 初期化
      onProgress?.("音素化エンジンを読み込み中...");
      const { SimpleUnifiedPhonemizer } = await getPiperPlus();
      phonemizer = new SimpleUnifiedPhonemizer();
      await phonemizer.initialize({
        openjtalk: {
          jsPath: `${base}piper/dist/openjtalk.js`,
          wasmPath: `${base}piper/dist/openjtalk.wasm`,
          dictPath: `${base}piper/assets/dict`,
          voicePath: `${base}piper/assets/voice/mei_normal.htsvoice`,
        },
      });

      // ONNX モデル読み込み
      onProgress?.("音声モデルを読み込み中...");
      onnxSession = await ort.InferenceSession.create(
        `${base}piper/models/tsukuyomi-wavlm-300epoch.onnx`,
        { executionProviders: ["wasm"], graphOptimizationLevel: "all" }
      );

      ready = true;
      onProgress?.(null);
      console.log("TTS(piper): 初期化完了");
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function synthesize(
  text: string,
  lengthScale?: number
): Promise<{ audio: Float32Array; sampleRate: number }> {
  if (!ready) throw new Error("TTS not initialized");

  const labels = await phonemizer.textToPhonemes(text, "ja");
  const phonemes = phonemizer.extractPhonemes(labels, "ja");
  const phonemeIds = phonemesToIds(phonemes);

  let prosodyFeatures: number[][] | null = null;
  if (modelConfig.prosody_id_map) {
    prosodyFeatures = extractProsody(labels, phonemeIds.length);
  }

  const inputTensor = new ort.Tensor(
    "int64",
    new BigInt64Array(phonemeIds.map((id: number) => BigInt(id))),
    [1, phonemeIds.length]
  );
  const lengthTensor = new ort.Tensor(
    "int64",
    new BigInt64Array([BigInt(phonemeIds.length)]),
    [1]
  );
  const scalesTensor = new ort.Tensor(
    "float32",
    new Float32Array([
      modelConfig.inference.noise_scale || 0.667,
      lengthScale ?? modelConfig.inference.length_scale ?? 1.0,
      modelConfig.inference.noise_w || 0.8,
    ]),
    [3]
  );

  const feeds: Record<string, any> = {
    input: inputTensor,
    input_lengths: lengthTensor,
    scales: scalesTensor,
  };

  if (prosodyFeatures && modelConfig.prosody_id_map) {
    const flat: bigint[] = [];
    for (const [a1, a2, a3] of prosodyFeatures) {
      flat.push(BigInt(a1), BigInt(a2), BigInt(a3));
    }
    feeds["prosody_features"] = new ort.Tensor(
      "int64",
      new BigInt64Array(flat),
      [1, phonemeIds.length, 3]
    );
  }

  const results = await onnxSession.run(feeds);
  const audioTensor = results["output"] || results[Object.keys(results)[0]];

  return {
    audio: new Float32Array(audioTensor.data),
    sampleRate: modelConfig.audio.sample_rate,
  };
}

/** Release piper resources (phonemizer, ONNX session) */
export async function dispose(): Promise<void> {
  if (phonemizer) {
    try {
      phonemizer.dispose();
    } catch {
      // ignore
    }
    phonemizer = null;
  }
  if (onnxSession) {
    try {
      await onnxSession.release();
    } catch {
      // ignore
    }
    onnxSession = null;
  }
  modelConfig = null;
  ready = false;
  initPromise = null;
}

function phonemesToIds(phonemes: string[]): number[] {
  let processed = phonemes;
  if (phonemes.length < 20) {
    processed = [
      phonemes[0],
      "_",
      "_",
      ...phonemes.slice(1, -1),
      "_",
      "_",
      phonemes[phonemes.length - 1],
    ];
  }
  const ids: number[] = [];
  const map = modelConfig.phoneme_id_map;
  for (const ph of processed) {
    if (map[ph]) {
      ids.push(...map[ph]);
    } else {
      ids.push(...(map["_"] || [0]));
    }
  }
  return ids;
}

/**
 * piper-global-loader.js が window.__PiperPlus に公開する
 * SimpleUnifiedPhonemizer を取得する。
 * ローダーがまだ完了していない場合は 'piper-plus-ready' イベントを待つ。
 */
function getPiperPlus(): Promise<any> {
  if ((window as any).__PiperPlus) {
    return Promise.resolve((window as any).__PiperPlus);
  }
  return new Promise((resolve) => {
    window.addEventListener("piper-plus-ready", () => {
      resolve((window as any).__PiperPlus);
    }, { once: true });
  });
}

function extractProsody(labels: string, count: number): number[][] {
  const lines = labels.split("\n").filter((l: string) => l.trim());
  const prosody: number[][] = [[0, 0, 0]];
  const reA1 = /\/A:([\d-]+)\+/;
  const reA2 = /\+([0-9]+)\+/;
  const reA3 = /\+([0-9]+)\//;

  for (const line of lines) {
    const m = line.match(/-([^+]+)\+/);
    if (m && m[1] !== "sil" && m[1] !== "pau") {
      const mA1 = reA1.exec(line);
      const mA2 = reA2.exec(line);
      const mA3 = reA3.exec(line);
      const a1 = mA1 ? Math.max(0, Math.min(10, parseInt(mA1[1]) + 5)) : 0;
      const a2 = mA2 ? Math.min(10, parseInt(mA2[1])) : 0;
      const a3 = mA3 ? Math.min(10, parseInt(mA3[1])) : 0;
      prosody.push([a1, a2, a3]);
    }
  }
  prosody.push([0, 0, 0]);
  while (prosody.length < count) prosody.push([0, 0, 0]);
  return prosody.slice(0, count);
}
