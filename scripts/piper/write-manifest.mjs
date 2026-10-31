import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../public/piper/", import.meta.url));
const manifestPath = path.join(root, "manifest.json");
const strict = process.argv.includes("--strict");
const required = [
  "piper-global-loader.js", "dist/ort.min.js", "dist/ort-wasm-simd.wasm",
  "dist/openjtalk.js", "dist/openjtalk.wasm", "assets/voice/mei_normal.htsvoice",
  "assets/dict/sys.dic", "assets/dict/matrix.bin", "assets/dict/char.bin",
  "assets/dict/left-id.def", "assets/dict/right-id.def", "assets/dict/pos-id.def",
  "assets/dict/rewrite.def", "assets/dict/unk.dic",
  "models/tsukuyomi-config.json", "models/tsukuyomi-wavlm-300epoch.onnx",
];

async function inventory(directory = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = directory ? `${directory}/${entry.name}` : entry.name;
    if (relative === "manifest.json" || relative === "licenses") continue;
    if (entry.isDirectory()) files.push(...await inventory(relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

// Only content fields determine the browser cache version. Local modification
// times are a hash-reuse hint and must not change the version or its validation.
function contentVersion(files) {
  const canonical = files.map(({ path, size, sha256 }) => ({ path, size, sha256 }))
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

async function previousFiles() {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!Array.isArray(manifest.files) || !manifest.files.every((file) =>
      typeof file.path === "string" && Number.isSafeInteger(file.size) &&
      file.size >= 0 && /^[a-f0-9]{64}$/.test(file.sha256)) ||
      contentVersion(manifest.files) !== manifest.version) return new Map();
    return new Map(manifest.files.map((file) => [file.path, file]));
  } catch {
    return new Map();
  }
}

async function generate() {
  const paths = (await inventory()).sort();
  for (const file of required) {
    if (!paths.includes(file)) throw new Error(`Missing Piper asset: ${file}`);
  }
  const previous = await previousFiles();
  const files = [];
  let reused = 0;
  for (const file of paths) {
    const absolute = path.join(root, file);
    const metadata = await stat(absolute);
    const cached = previous.get(file);
    let sha256;
    if (cached?.size === metadata.size && cached.mtimeMs === metadata.mtimeMs) {
      sha256 = cached.sha256;
      reused++;
    } else {
      const hash = createHash("sha256");
      let size = 0;
      for await (const chunk of createReadStream(absolute)) {
        size += chunk.byteLength;
        hash.update(chunk);
      }
      const after = await stat(absolute);
      if (size !== metadata.size || after.size !== metadata.size || after.mtimeMs !== metadata.mtimeMs) {
        throw new Error(`Piper asset changed during hashing: ${file}`);
      }
      sha256 = hash.digest("hex");
    }
    files.push({ path: file, size: metadata.size, sha256, mtimeMs: metadata.mtimeMs });
  }
  const version = contentVersion(files);
  await writeFile(manifestPath, `${JSON.stringify({ version, files }, null, 2)}\n`);
  console.log(`Wrote public/piper/manifest.json (${files.length - reused} hashed, ${reused} reused; version ${version})`);
}

try {
  await generate();
} catch (error) {
  // A stale manifest must not advertise assets that are no longer present.
  try { await rm(manifestPath, { force: true }); } catch { /* Best effort in restricted environments. */ }
  if (strict) {
    console.error(`Piper manifest generation failed: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log("Piper assets unavailable; skipping voice manifest (the app can still run without TTS).");
  }
}
