---
license: mit
language:
- ja
pipeline_tag: text-to-speech
tags:
- tts
- onnx
- webgpu
- irodori-tts
---

# Irodori TTS WebGPU assets for chrome-on-aituber

fp16 ONNX export of [Irodori-TTS](https://github.com/Aratako/Irodori-TTS), packaged
for in-browser WebGPU inference with
[chrome-on-aituber](https://github.com/shinshin86/chrome-on-aituber).
The browser app downloads these files directly (CORS) and stores them in
browser storage; nothing is sent to a server.

## Contents

| Path | Description |
| --- | --- |
| `manifest.json` | Download manifest (version, file list, sizes) |
| `onnx_fp16/` | fp16 ONNX graphs + external weights (text/speaker/duration/DiT/DACVAE) |
| `tokenizer/llmjp_tok/` | llm-jp-3-150m tokenizer files |
| `runtime/` | Bundled WebGPU runtime (`pipeline.mjs`) and ONNX Runtime wasm loaders |
| `licenses/` | Full license texts and third-party notices for everything above |

The ONNX export and the inference runtime are built with
[ngc-shj/irodori-tts-webgpu](https://github.com/ngc-shj/irodori-tts-webgpu).
The reproducible build recipe lives in the
[chrome-on-aituber repository](https://github.com/shinshin86/chrome-on-aituber/tree/main/scripts/irodori).

## Licenses and attribution

This repository redistributes derivative weights and runtime code. See
`licenses/` for the full texts and `licenses/THIRD_PARTY_NOTICES.txt` /
`licenses/NOTICE` for details.

- [Aratako/Irodori-TTS-500M-v3](https://huggingface.co/Aratako/Irodori-TTS-500M-v3) — MIT
- [Aratako/Semantic-DACVAE-Japanese-32dim](https://huggingface.co/Aratako/Semantic-DACVAE-Japanese-32dim) — MIT (derived from [facebook/dacvae-watermarked](https://huggingface.co/facebook/dacvae-watermarked), Apache-2.0)
- [llm-jp/llm-jp-3-150m](https://huggingface.co/llm-jp/llm-jp-3-150m) tokenizer — Apache-2.0
- [ngc-shj/irodori-tts-webgpu](https://github.com/ngc-shj/irodori-tts-webgpu) — MIT
- [onnxruntime-web](https://github.com/microsoft/onnxruntime) — MIT
- [@huggingface/tokenizers](https://github.com/huggingface/tokenizers.js) — Apache-2.0

## Responsible use

This model performs reference-audio-based voice synthesis (voice cloning).
Do not use it for impersonation, fraud, or generating misleading content.
Only use reference audio you have the right to use. Note that, unlike the
Python reference implementation of Irodori-TTS, this browser runtime does not
apply SilentCipher watermarking to generated audio
(see `licenses/THIRD_PARTY_NOTICES.txt`).
