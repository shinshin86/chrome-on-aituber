/**
 * TTS Service — エンジン切替 facade
 *
 * 呼び出し側（useChat など）からは従来どおり
 * isReady / initialize / speak / stop を使う。
 * 実際の合成は ttsEngine 設定に応じて Piper Plus / Irodori に委譲し、
 * 再生と口パクは audioPlayback.ts に共通化している。
 */

import type { PiperVoice, TtsEngine } from "../../types";
import * as playback from "./audioPlayback";
import * as piper from "./piperTtsProvider";
import * as irodori from "./irodoriTtsProvider";

let currentEngine: TtsEngine = "piper";
/** Bumped on every engine or voice switch so audio made before it is dropped */
let switchGeneration = 0;

export function getEngine(): TtsEngine {
  return currentEngine;
}

/**
 * 使用する TTS エンジンを切り替える。
 * 切替時は再生を止め、旧エンジンのリソースを解放する。
 */
export async function setEngine(engine: TtsEngine): Promise<void> {
  if (engine === currentEngine) return;
  switchGeneration++;
  stop();
  const previous = currentEngine;
  currentEngine = engine;
  if (previous === "piper") {
    await piper.dispose();
  } else {
    await irodori.dispose();
  }
}

/** Select the Piper Plus voice model. Playback stops when the voice changes. */
export async function setPiperVoice(voice: PiperVoice): Promise<void> {
  if (voice === piper.getVoice()) return;
  switchGeneration++;
  stop();
  await piper.setVoice(voice);
}

export function isReady(): boolean {
  return currentEngine === "piper" ? piper.isReady() : irodori.isReady();
}

export async function initialize(
  onProgress?: (msg: string | null) => void
): Promise<void> {
  if (currentEngine === "piper") {
    return piper.initialize(onProgress);
  }
  return irodori.initialize(onProgress);
}

export async function synthesize(
  text: string,
  lengthScale?: number
): Promise<{ audio: Float32Array; sampleRate: number }> {
  if (currentEngine === "piper") {
    return piper.synthesize(text, lengthScale);
  }
  // Irodori は読み上げ速度（lengthScale）非対応
  return irodori.synthesize(text);
}

export async function speak(
  text: string,
  onMouthChange: (level: number) => void,
  lengthScale?: number
): Promise<void> {
  stop();
  onMouthChange(0);

  const generation = switchGeneration;
  if (!isReady()) {
    await initialize((msg) => msg && console.log("TTS:", msg));
  }
  // A voice switch during initialization releases the model it loaded.
  if (generation !== switchGeneration) return;

  const { audio, sampleRate } = await synthesize(text, lengthScale);
  if (generation !== switchGeneration) return;
  await playback.play(audio, sampleRate, onMouthChange);
}

export function stop(options?: { cancelIrodori?: boolean }): void {
  playback.stop();
  if (options?.cancelIrodori && currentEngine === "irodori") {
    irodori.cancel();
  }
}

/** Release all TTS resources (providers + AudioContext) */
export async function dispose(): Promise<void> {
  stop();
  await piper.dispose();
  await irodori.dispose();
  await playback.dispose();
}
