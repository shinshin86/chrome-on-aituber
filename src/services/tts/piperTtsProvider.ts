/**
 * Piper Plus TTS Provider — piper-plus WASM + ONNX Runtime
 *
 * piper-plus の JS モジュール群は ES module (import/export) で書かれている。
 * Vite ビルドに含めると WASM 周りの問題が起きるため、
 * public/ に配置した JS/WASM を動的に読み込む。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PiperVoice } from "../../types";

interface PiperVoiceAssets {
  configFile: string;
  modelFile: string;
  /**
   * Multiplied with the requested length scale. When omitted, the model
   * config's length_scale is used as the default instead.
   */
  baseLengthScale?: number;
}

const PIPER_VOICE_ASSETS: Record<PiperVoice, PiperVoiceAssets> = {
  tsukuyomi: {
    configFile: "tsukuyomi-config.json",
    modelFile: "tsukuyomi-wavlm-300epoch.onnx",
  },
  // The model card suggests a length_scale of 1.07 for sample-voice-v2.
  miko: {
    configFile: "miko-sample-voice-v2.onnx.json",
    modelFile: "miko-sample-voice-v2.onnx",
    baseLengthScale: 1.07,
  },
};

let currentVoice: PiperVoice = "tsukuyomi";
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

export function getVoice(): PiperVoice {
  return currentVoice;
}

/**
 * Select the voice model. A different voice releases the loaded model; the
 * phonemizer is kept and the next initialize() only loads the new model.
 */
export async function setVoice(voice: PiperVoice): Promise<void> {
  if (voice === currentVoice) return;
  currentVoice = voice;
  if (initPromise) {
    await initPromise.catch(() => undefined);
  }
  await releaseModel();
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

      const voiceAssets = PIPER_VOICE_ASSETS[currentVoice];

      // モデル設定読み込み
      onProgress?.("モデル設定を読み込み中...");
      const configResp = await fetch(`${base}piper/models/${voiceAssets.configFile}`);
      if (!configResp.ok) {
        throw new Error(
          `Voice model config not found: ${voiceAssets.configFile} (HTTP ${configResp.status})`
        );
      }
      modelConfig = await configResp.json();

      // OpenJTalk Phonemizer 初期化
      if (!phonemizer) {
        onProgress?.("音素化エンジンを読み込み中...");
        const { SimpleUnifiedPhonemizer } = await getPiperPlus();
        const created = new SimpleUnifiedPhonemizer();
        await created.initialize({
          openjtalk: {
            jsPath: `${base}piper/dist/openjtalk.js`,
            wasmPath: `${base}piper/dist/openjtalk.wasm`,
            dictPath: `${base}piper/assets/dict`,
            voicePath: `${base}piper/assets/voice/mei_normal.htsvoice`,
          },
        });
        phonemizer = created;
      }

      // ONNX モデル読み込み
      onProgress?.("音声モデルを読み込み中...");
      onnxSession = await ort.InferenceSession.create(
        `${base}piper/models/${voiceAssets.modelFile}`,
        { executionProviders: ["wasm"], graphOptimizationLevel: "all" }
      );

      ready = true;
      onProgress?.(null);
      console.log(`TTS(piper): 初期化完了 (${currentVoice})`);
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
  const multilingual = isMultilingualModel(modelConfig);
  const modelInputs = multilingual
    ? buildMultilingualInputs(phonemes, labels, modelConfig.phoneme_id_map)
    : { phonemeIds: phonemesToIds(phonemes), prosody: null };
  const { phonemeIds } = modelInputs;

  let prosodyFeatures: number[][] | null = null;
  if (modelConfig.prosody_id_map) {
    prosodyFeatures =
      modelInputs.prosody ?? extractProsody(labels, phonemeIds.length);
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
      resolveLengthScale(lengthScale),
      modelConfig.inference.noise_w || 0.8,
    ]),
    [3]
  );

  const feeds: Record<string, any> = {
    input: inputTensor,
    input_lengths: lengthTensor,
    scales: scalesTensor,
  };

  const languageId = resolveLanguageId(modelConfig.language_id_map);
  if (languageId !== undefined) {
    feeds["lid"] = new ort.Tensor(
      "int64",
      new BigInt64Array([BigInt(languageId)]),
      [1]
    );
  }

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
  await releaseModel();
}

async function releaseModel(): Promise<void> {
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

function resolveLengthScale(lengthScale: number | undefined): number {
  const { baseLengthScale } = PIPER_VOICE_ASSETS[currentVoice];
  if (baseLengthScale !== undefined) {
    return (lengthScale ?? 1.0) * baseLengthScale;
  }
  return lengthScale ?? modelConfig.inference.length_scale ?? 1.0;
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

/**
 * Multilingual piper-plus models (zs-v1 based) take a language id. OpenJTalk
 * only phonemizes Japanese, so prefer "ja" and fall back to the first entry.
 */
function resolveLanguageId(
  languageIdMap: Record<string, number> | undefined
): number | undefined {
  if (!languageIdMap) return undefined;
  const ja = languageIdMap["ja"];
  if (typeof ja === "number") return ja;
  const first = Object.values(languageIdMap)[0];
  return typeof first === "number" ? first : undefined;
}

function isMultilingualModel(config: any): boolean {
  return Object.keys(config.language_id_map ?? {}).length > 1;
}

const SPECIAL_TOKENS = new Set(["^", "$", "_", "#", "[", "]", "?", "?!", "?.", "?~"]);
const EOS_TOKENS = new Set(["$", "?", "?!", "?.", "?~"]);
/** Short inputs are padded with silence up to this many ids */
const MIN_PHONEME_IDS = 15;
const MIN_BODY_FOR_PADDING = 3;

interface ModelInputs {
  phonemeIds: number[];
  prosody: number[][] | null;
}

/**
 * Multilingual models are trained on sequences with a pad id after every
 * token (BOS, t0, PAD, t1, PAD, ..., EOS) and with raw OpenJTalk accent
 * values, unlike the single-language Japanese models.
 */
function buildMultilingualInputs(
  tokens: string[],
  labels: string,
  phonemeIdMap: Record<string, number[]>
): ModelInputs {
  const accents = extractRawAccents(labels);
  const firstId = (token: string, fallback: number) =>
    phonemeIdMap[token]?.[0] ?? fallback;
  const bos = firstId("^", 1);
  const pad = firstId("_", 0);
  const zero = [0, 0, 0];

  const phonemeIds = [bos];
  const prosody: number[][] = [zero];
  let eosToken = "$";
  let accentIndex = 0;

  for (const token of tokens) {
    if (token === "^") continue;
    if (EOS_TOKENS.has(token)) {
      eosToken = token;
      continue;
    }
    const isPhoneme = !SPECIAL_TOKENS.has(token);
    const accent = isPhoneme ? (accents[accentIndex++] ?? zero) : zero;
    const ids = phonemeIdMap[token];
    if (ids) {
      for (const id of ids) {
        phonemeIds.push(id);
        prosody.push(accent);
      }
    }
    phonemeIds.push(pad);
    prosody.push(zero);
  }

  phonemeIds.push(firstId(eosToken, firstId("$", 2)));
  prosody.push(zero);

  return padShortInputs({ phonemeIds, prosody }, pad);
}

/** Insert silence ids after BOS and before EOS so short lines keep their timing. */
function padShortInputs(inputs: ModelInputs, pad: number): ModelInputs {
  const { phonemeIds, prosody } = inputs;
  const total = phonemeIds.length;
  const body = total - 2;
  if (body < MIN_BODY_FOR_PADDING || total >= MIN_PHONEME_IDS) {
    return inputs;
  }
  const missing = MIN_PHONEME_IDS - total;
  const front = Math.floor(missing / 2);
  const back = missing - front;
  const zeros = (count: number) => Array.from({ length: count }, () => [0, 0, 0]);
  return {
    phonemeIds: [
      phonemeIds[0],
      ...new Array<number>(front).fill(pad),
      ...phonemeIds.slice(1, -1),
      ...new Array<number>(back).fill(pad),
      phonemeIds[total - 1],
    ],
    prosody: prosody
      ? [
          prosody[0],
          ...zeros(front),
          ...prosody.slice(1, -1),
          ...zeros(back),
          prosody[total - 1],
        ]
      : null,
  };
}

/** Raw A1/A2/A3 accent values for every phoneme label (silence and pauses skipped). */
function extractRawAccents(labels: string): number[][] {
  const accents: number[][] = [];
  const reA1 = /\/A:([\d-]+)\+/;
  const reA2 = /\+([0-9]+)\+/;
  const reA3 = /\+([0-9]+)\//;
  for (const line of labels.split("\n")) {
    const m = line.match(/-([^-+]+)\+/);
    if (!m || m[1] === "sil" || m[1] === "pau") continue;
    const mA1 = reA1.exec(line);
    const mA2 = reA2.exec(line);
    const mA3 = reA3.exec(line);
    accents.push(
      mA1 && mA2 && mA3
        ? [parseInt(mA1[1], 10), parseInt(mA2[1], 10), parseInt(mA3[1], 10)]
        : [0, 0, 0]
    );
  }
  return accents;
}
