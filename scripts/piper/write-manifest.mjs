import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../public/piper/", import.meta.url));
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

const paths = (await inventory()).sort();
for (const file of required) {
  if (!paths.includes(file)) throw new Error(`Missing Piper asset: ${file}`);
}
const files = [];
for (const file of paths) {
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(path.join(root, file))) {
    size += chunk.byteLength;
    hash.update(chunk);
  }
  files.push({ path: file, size, sha256: hash.digest("hex") });
}
// Hash the sorted inventory, including runtime JavaScript, to invalidate WASM
// and model caches whenever their accompanying assets change.
const version = createHash("sha256").update(JSON.stringify(files)).digest("hex");
await writeFile(path.join(root, "manifest.json"), `${JSON.stringify({ version, files }, null, 2)}\n`);
console.log(`Wrote public/piper/manifest.json (${files.length} files, version ${version})`);
