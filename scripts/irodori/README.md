# Irodori TTS WebGPU assets build notes

This directory keeps the reproducible build recipe for `public/irodori/`.
The generated ONNX models and runtime assets are intentionally not committed.

## Current asset set

- Version: `irodori-fp16-webgpu-v2-20260612`
- Variant: `fp16-webgpu-conv-subpix`
- Reference repo: `ngc-shj/irodori-tts-webgpu`
- Pinned commit used locally: `aa3b6390018bb09a2e461c95d1f55992c06e197d`
- Upstream Irodori-TTS clone observed locally: `eaf74d6a19138f743acb5b71a445fd25a57db987`
- Runtime deps bundled into `runtime/pipeline.mjs`:
  - `onnxruntime-web@1.26.0`
  - `@huggingface/tokenizers@0.1.3`
  - `vite@8.0.16` for the bundle build. Vite 8 emits a Rolldown bundle.

The current `public/irodori/onnx_fp16` files match
`/private/tmp/irodori-tts-webgpu/artifacts/onnx_fp16` by byte size.
The current `public/irodori/runtime/pipeline.mjs` matches
`/private/tmp/irodori-export/pipeline-src/dist/pipeline.mjs`.

## 1. Generate ONNX artifacts

Clone or update the reference repo and pin the commit:

```bash
git clone https://github.com/ngc-shj/irodori-tts-webgpu /path/to/irodori-tts-webgpu
git -C /path/to/irodori-tts-webgpu checkout aa3b6390018bb09a2e461c95d1f55992c06e197d
```

The reference repo is self-contained for export. Use `uv`:

```bash
cd /path/to/irodori-tts-webgpu
bash export/setup_env.sh
```

Generate fp32 first:

```bash
.venv/bin/python export/export_dacvae_decoder.py
.venv/bin/python export/export_text_encoder.py
.venv/bin/python export/export_dit.py
.venv/bin/python export/export_rest.py
```

Generate the fp16 set used by this app:

```bash
.venv/bin/python export/export_dit_fp16.py
.venv/bin/python export/export_encoders_fp16.py
.venv/bin/python export/convert_fp16.py
.venv/bin/python export/rewrite_convtranspose.py
.venv/bin/python export/convert_fp16_decoder_mixed.py \
  --in artifacts/onnx/dacvae_decoder_subpix.onnx \
  --out artifacts/onnx_fp16/dacvae_decoder.onnx
```

Do not replace the decoder with a naive fp16 `ConvTranspose` conversion. The
reference repo rewrites `ConvTranspose` to `Conv` first because
`onnxruntime-web` WebGPU fp16 `ConvTranspose` produced noise.

## 2. Build `runtime/pipeline.mjs`

The source for this app-specific adapter is:

- `scripts/irodori/pipeline-src/src/adapter.js`
- `scripts/irodori/pipeline-src/vite.config.mjs`

`createPipeline()` is not provided by the reference repo. The adapter injects:

- `onnxruntime-web/webgpu`
- `@huggingface/tokenizers`
- `IrodoriTTS` from the reference repo's `runtime/pipeline.mjs`

Build:

```bash
node scripts/irodori/build-runtime.mjs \
  --irodori-webgpu /path/to/irodori-tts-webgpu
```

This copies `/path/to/irodori-tts-webgpu/runtime/pipeline.mjs` into
`scripts/irodori/pipeline-src/vendor/irodori-pipeline.mjs`, runs `npm install`,
and writes `scripts/irodori/pipeline-src/dist/pipeline.mjs`.

## 3. Package `public/irodori/`

```bash
node scripts/irodori/package-assets.mjs \
  --version irodori-fp16-webgpu-v2-YYYYMMDD \
  --irodori-webgpu /path/to/irodori-tts-webgpu \
  --pipeline scripts/irodori/pipeline-src/dist/pipeline.mjs \
  --out public/irodori
```

This copies:

- `artifacts/onnx_fp16/` to `public/irodori/onnx_fp16/`
- `tokenizer/llmjp_tok/` to `public/irodori/tokenizer/llmjp_tok/`
- `LICENSES/` and repo `LICENSE` to `public/irodori/licenses/`
- `scripts/irodori/license-templates/` to `public/irodori/licenses/`
- `pipeline.mjs` to `public/irodori/runtime/pipeline.mjs`
- selected `onnxruntime-web@1.26.0/dist/ort-wasm-simd-threaded.*` files to
  `public/irodori/runtime/`

Then it regenerates `public/irodori/manifest.json`.

## 4. Manifest rule

`manifest.json` is generated from actual byte sizes, not hand-written:

```bash
node scripts/irodori/generate-manifest.mjs \
  --root public/irodori \
  --version irodori-fp16-webgpu-v2-YYYYMMDD
```

The manifest includes the explicit download set:

- `runtime/pipeline.mjs`
- all `onnx_fp16/*.onnx` and `*.onnx.data`
- tokenizer files
- redistributed license files

The ORT wasm files are copied into `runtime/` but are not currently listed in
the manifest. They are loaded by `pipeline.mjs` from the same directory via
`ort.env.wasm.wasmPaths`.

## 5. License files

The active license set comes from the reference repo's `LICENSES/` directory:

- `NOTICE`
- `Irodori-TTS-LICENSE`
- `Semantic-DACVAE-LICENSE`
- `llm-jp-3-150m-LICENSE`

The package step also copies the reference repo root `LICENSE` as
`irodori-tts-webgpu-LICENSE`.

Additional templates kept in this repository are copied from
`scripts/irodori/license-templates/` on every package run:

- `THIRD_PARTY_NOTICES.txt`
- `Irodori-TTS-MIT-LICENSE.txt`
- `onnxruntime-MIT-LICENSE.txt`
- `huggingface-tokenizers-Apache-2.0-LICENSE.txt`

If dependency versions change, re-check and update:

- `onnxruntime-web`: MIT
- `@huggingface/tokenizers`: Apache-2.0
- model/tokenizer notices from the reference repo

## 6. Version rule

The manifest `version` is part of the browser storage key. Changing it makes all
users download a fresh copy.

Keep the version unchanged for metadata-only changes outside manifest files.
Bump it when any manifest-listed file changes:

- ONNX weights or external data
- tokenizer files
- `runtime/pipeline.mjs`
- redistributed license files

Recommended format:

```text
irodori-fp16-webgpu-v<N>-YYYYMMDD
```

Increment `v<N>` for incompatible runtime/model layout changes. Change the date
for ordinary rebuilds.

## 7. Deployment

The asset set is too large (~1.3GB) for GitHub Pages (1GB site limit), and
GitHub Release assets do not send CORS headers, so the browser cannot fetch
them directly. Deployment therefore splits in two:

- **Runtime (`runtime/` + `licenses/`, ~113MB)** stays on GitHub Pages because
  `pipeline.mjs` and the ort-wasm loaders are dynamically imported and require
  a JavaScript MIME type (Hugging Face serves `.mjs` as `text/plain`). It is
  shipped as a GitHub Release tarball that CI extracts into `public/` at build
  time, same as the Piper assets.
- **Models, tokenizer, manifest (~1.2GB)** go to a public Hugging Face model
  repository, which serves with CORS and is free. The browser downloads them
  directly via `VITE_IRODORI_ASSETS_BASE_URL`.

Steps after (re)building `public/irodori/`:

```bash
# 1. Runtime tarball -> GitHub Release
./scripts/irodori/release-runtime-assets.sh
#    -> set repository variable IRODORI_RUNTIME_ASSETS_URL to the printed URL

# 2. Full asset set -> Hugging Face (requires `hf auth login` once)
./scripts/irodori/release-assets-hf.sh <hf-user>/<repo>
#    -> set repository variable IRODORI_ASSETS_BASE_URL to the printed URL

# 3. Push to main; .github/workflows/deploy.yml picks both up
```

The model card uploaded to Hugging Face is kept at
`scripts/irodori/hf-model-card.md`. Both variables are optional: when unset,
the deploy workflow simply builds without Irodori support (same-origin
fallback), which keeps forks working without any of this setup.
