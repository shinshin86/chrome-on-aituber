#!/usr/bin/env node
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const pipelineDir = resolve(here, "pipeline-src");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const irodoriWebgpuDir = resolve(
  argValue("--irodori-webgpu", process.env.IRODORI_WEBGPU_DIR ?? "/private/tmp/irodori-tts-webgpu")
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

await mkdir(resolve(pipelineDir, "vendor"), { recursive: true });
await copyFile(
  resolve(irodoriWebgpuDir, "runtime/pipeline.mjs"),
  resolve(pipelineDir, "vendor/irodori-pipeline.mjs")
);

const install = spawnSync(npmCommand, ["install"], {
  cwd: pipelineDir,
  stdio: "inherit",
});
if (install.status !== 0) process.exit(install.status ?? 1);

const build = spawnSync(npmCommand, ["run", "build"], {
  cwd: pipelineDir,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`built: ${resolve(pipelineDir, "dist/pipeline.mjs")}`);
