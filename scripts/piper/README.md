# Piper Plus assets license notes

This directory keeps the reproducible license templates for `public/piper/`.
The generated model/runtime assets are intentionally not committed.

## Current release inventory

- Release: `piper-assets-v1`
- URL: `https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz`
- SHA-256: `f1d1ba5d655cb2ec659e7f47efbe729ed062b3119fdd352663aa3542766f43de`

The checked archive contains only one license-like file:

- `piper/assets/dict/COPYING`

It does not contain `piper/licenses/`, a third-party notice file, piper-plus
MIT text, ONNX Runtime MIT text, MeCab text, HTS voice license text, or a
Tsukuyomi-chan corpus notice.

## Package rule

`scripts/package-piper-assets.sh` copies `scripts/piper/licenses/` to
`public/piper/licenses/` before creating `piper-assets.tar.gz`.

Run:

```bash
./scripts/package-piper-assets.sh
```

Then upload a new GitHub Release asset with `scripts/release-piper-assets.sh`.
Because `piper-assets-v1` lacks the new `piper/licenses/` directory, update the
GitHub Actions repository variable `PIPER_ASSETS_URL` to the new release asset
URL after uploading.

## License sources to re-check on asset changes

- piper-plus / openjtalk-web:
  `https://github.com/ayutaz/piper-plus/tree/dev/src/wasm/openjtalk-web`
- Open JTalk:
  `https://open-jtalk.sourceforge.net/`
- ONNX Runtime Web:
  `https://github.com/microsoft/onnxruntime`
- Tsukuyomi-chan model:
  `https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan`
- Tsukuyomi-chan corpus terms:
  `https://tyc.rei-yumesaki.net/material/corpus/`

Re-run the inventory checks whenever model names, ONNX Runtime files, or
piper-plus runtime files change. In particular, upstream piper-plus currently
has `@piper-plus/g2p` in its npm package metadata, but that package is not
present in the existing `piper-assets-v1` archive.

## Miko voice model

The Miko voice model is not part of the piper-assets release archive.
`scripts/piper/fetch-miko-voice.sh` downloads it from
`https://huggingface.co/shinshin86/aituber-onair-miko-voice-piper-plus` at a
pinned revision, verifies both files by SHA-256, and copies
`THIRD_PARTY_NOTICES.txt`, `miko-voice-NOTICE.md`, `piper-plus-base-model-MIT.txt`, and
`piper-plus-base-model-NOTICE.md` into `public/piper/licenses/`. The deploy
workflow runs it after extracting the piper assets. To move to a newer model
revision, update `REVISION` and both SHA-256 values in the script.
