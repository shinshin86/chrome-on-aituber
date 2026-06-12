#!/usr/bin/env node
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const irodoriWebgpuDir = resolve(
  argValue("--irodori-webgpu", process.env.IRODORI_WEBGPU_DIR ?? "/private/tmp/irodori-tts-webgpu")
);
const pipeline = resolve(
  argValue("--pipeline", "scripts/irodori/pipeline-src/dist/pipeline.mjs")
);
const outDir = resolve(argValue("--out", "public/irodori"));
const version = argValue("--version", process.env.IRODORI_VERSION);

if (!version) {
  console.error("Usage: node scripts/irodori/package-assets.mjs --version <version> [--irodori-webgpu <dir>] [--pipeline <file>] [--out public/irodori]");
  process.exit(1);
}

async function copy(src, dst) {
  await mkdir(resolve(dst, ".."), { recursive: true });
  await copyFile(src, dst);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await cp(
  resolve(irodoriWebgpuDir, "artifacts/onnx_fp16"),
  resolve(outDir, "onnx_fp16"),
  { recursive: true }
);
await cp(
  resolve(irodoriWebgpuDir, "tokenizer/llmjp_tok"),
  resolve(outDir, "tokenizer/llmjp_tok"),
  { recursive: true }
);
await cp(
  resolve(irodoriWebgpuDir, "LICENSES"),
  resolve(outDir, "licenses"),
  { recursive: true }
);

await copy(
  resolve(irodoriWebgpuDir, "LICENSE"),
  resolve(outDir, "licenses/irodori-tts-webgpu-LICENSE")
);
await copy(pipeline, resolve(outDir, "runtime/pipeline.mjs"));

const ortDist = resolve("scripts/irodori/pipeline-src/node_modules/onnxruntime-web/dist");
for (const name of [
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
]) {
  await copy(resolve(ortDist, name), resolve(outDir, "runtime", name));
}

const manifest = spawnSync(
  process.execPath,
  [
    "scripts/irodori/generate-manifest.mjs",
    "--root",
    outDir,
    "--version",
    version,
  ],
  { cwd: resolve("."), stdio: "inherit" }
);
if (manifest.status !== 0) process.exit(manifest.status ?? 1);

console.log(`packaged: ${outDir}`);
