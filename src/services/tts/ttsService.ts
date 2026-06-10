/**
 * TTS Service — エンジン切替 facade
 *
 * 呼び出し側（useChat など）からは従来どおり
 * isReady / initialize / speak / stop を使う。
 * 実際の合成は ttsEngine 設定に応じて Piper Plus / Irodori に委譲し、
 * 再生と口パクは audioPlayback.ts に共通化している。
 */

import type { TtsEngine } from "../../types";
import * as playback from "./audioPlayback";
import * as piper from "./piperTtsProvider";
import * as irodori from "./irodoriTtsProvider";

let currentEngine: TtsEngine = "piper";

export function getEngine(): TtsEngine {
  return currentEngine;
}

/**
 * 使用する TTS エンジンを切り替える。
 * 切替時は再生を止め、旧エンジンのリソースを解放する。
 */
export async function setEngine(engine: TtsEngine): Promise<void> {
  if (engine === currentEngine) return;
  stop();
  const previous = currentEngine;
  currentEngine = engine;
  if (previous === "piper") {
    await piper.dispose();
  } else {
    await irodori.dispose();
  }
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
  onMouthChange: (open: boolean) => void,
  lengthScale?: number
): Promise<void> {
  stop();
  onMouthChange(false);

  if (!isReady()) {
    await initialize((msg) => msg && console.log("TTS:", msg));
  }

  const { audio, sampleRate } = await synthesize(text, lengthScale);
  await playback.play(audio, sampleRate, onMouthChange);
}

export function stop(): void {
  playback.stop();
}

/** Release all TTS resources (providers + AudioContext) */
export async function dispose(): Promise<void> {
  stop();
  await piper.dispose();
  await irodori.dispose();
  await playback.dispose();
}
