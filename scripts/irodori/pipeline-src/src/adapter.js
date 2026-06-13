// App-specific adapter for the Irodori TTS WebGPU runtime.
// The ONNX session setup (model name map, externalData wiring) follows
// web/app.mjs in ngc-shj/irodori-tts-webgpu (MIT License); the
// createPipeline() contract (loadAsset-based asset delivery, worker
// execution) is specific to this app. The inference core (IrodoriTTS)
// is vendored from that repository at build time and is not committed.
import * as ort from "onnxruntime-web/webgpu";
import { Tokenizer } from "@huggingface/tokenizers";
import { IrodoriTTS } from "../vendor/irodori-pipeline.mjs";

const MODEL_NAMES = {
  text: "text_encoder",
  speaker: "speaker_encoder",
  duration: "duration",
  dit: "dit",
  dac: "dacvae_decoder",
  enc: "dacvae_encoder",
};

const DEFAULT_STEPS = 16;
const DEFAULT_MAX_SECONDS = 8;

async function createSession(name, loadAsset, device) {
  const [modelBuffer, dataBuffer] = await Promise.all([
    loadAsset(`onnx_fp16/${name}.onnx`),
    loadAsset(`onnx_fp16/${name}.onnx.data`),
  ]);

  return ort.InferenceSession.create(new Uint8Array(modelBuffer), {
    executionProviders: [device],
    graphOptimizationLevel: "all",
    externalData: [
      {
        path: `${name}.onnx.data`,
        data: new Uint8Array(dataBuffer),
      },
    ],
  });
}

async function createTokenizer(loadAsset) {
  const [tokenizerJson, tokenizerConfigJson] = await Promise.all([
    loadAsset("tokenizer/llmjp_tok/tokenizer.json"),
    loadAsset("tokenizer/llmjp_tok/tokenizer_config.json"),
  ]);
  const decoder = new TextDecoder();
  const tokenizer = new Tokenizer(
    JSON.parse(decoder.decode(tokenizerJson)),
    JSON.parse(decoder.decode(tokenizerConfigJson))
  );

  return {
    encode(text, options) {
      const encoded = tokenizer.encode(text, options);
      return Array.from(encoded.ids ?? []);
    },
  };
}

export async function createPipeline({
  loadAsset,
  device,
  maxSeconds = DEFAULT_MAX_SECONDS,
  numSteps = DEFAULT_STEPS,
} = {}) {
  if (device !== "webgpu") {
    throw new Error("Irodori Web runtime requires WebGPU.");
  }
  if (typeof loadAsset !== "function") {
    throw new Error("Irodori Web runtime requires loadAsset(path).");
  }
  if (!globalThis.navigator?.gpu) {
    throw new Error("WebGPU is unavailable.");
  }

  ort.env.logLevel = "error";
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = new URL("./", import.meta.url).href;

  const sessions = {};
  try {
    const [tokenizer] = await Promise.all([
      createTokenizer(loadAsset),
      (async () => {
        for (const [key, name] of Object.entries(MODEL_NAMES)) {
          sessions[key] = await createSession(name, loadAsset, device);
        }
      })(),
    ]);

    const tts = new IrodoriTTS({ ort, sessions, tokenizer });
    return {
      async synthesize(text, referenceAudio) {
        return tts.synthesize(
          text,
          referenceAudio.samples,
          referenceAudio.sampleRate,
          { numSteps, maxSeconds }
        );
      },
      async dispose() {
        await Promise.all(
          Object.values(sessions).map((session) => session?.release?.())
        );
      },
    };
  } catch (err) {
    await Promise.all(
      Object.values(sessions).map((session) =>
        session?.release?.().catch(() => {})
      )
    );
    throw err;
  }
}
