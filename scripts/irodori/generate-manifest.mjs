#!/usr/bin/env node
import { stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_FILES = [
  "runtime/pipeline.mjs",
  "onnx_fp16/text_encoder.onnx",
  "onnx_fp16/text_encoder.onnx.data",
  "onnx_fp16/speaker_encoder.onnx",
  "onnx_fp16/speaker_encoder.onnx.data",
  "onnx_fp16/duration.onnx",
  "onnx_fp16/duration.onnx.data",
  "onnx_fp16/dit.onnx",
  "onnx_fp16/dit.onnx.data",
  "onnx_fp16/dacvae_encoder.onnx",
  "onnx_fp16/dacvae_encoder.onnx.data",
  "onnx_fp16/dacvae_decoder.onnx",
  "onnx_fp16/dacvae_decoder.onnx.data",
  "tokenizer/llmjp_tok/tokenizer.json",
  "tokenizer/llmjp_tok/tokenizer_config.json",
  "tokenizer/llmjp_tok/special_tokens_map.json",
  "licenses/NOTICE",
  "licenses/irodori-tts-webgpu-LICENSE",
  "licenses/Irodori-TTS-LICENSE",
  "licenses/Semantic-DACVAE-LICENSE",
  "licenses/llm-jp-3-150m-LICENSE",
];

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const root = resolve(argValue("--root", "public/irodori"));
const version = argValue("--version", process.env.IRODORI_VERSION);
const variant = argValue("--variant", "fp16-webgpu-conv-subpix");

if (!version) {
  console.error("Usage: node scripts/irodori/generate-manifest.mjs --version <version> [--root public/irodori]");
  process.exit(1);
}

const files = [];
for (const path of DEFAULT_FILES) {
  const info = await stat(resolve(root, path));
  files.push({ path, size: info.size });
}

const estimatedSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
const manifest = { version, variant, estimatedSizeBytes, files };
await writeFile(
  resolve(root, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`wrote ${resolve(root, "manifest.json")} (${estimatedSizeBytes} bytes)`);
