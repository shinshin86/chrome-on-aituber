#!/usr/bin/env bash
# Download the Miko voice model for Piper Plus into public/piper/models/ and
# copy its license notices into public/piper/licenses/. The updated
# THIRD_PARTY_NOTICES.txt is copied too, because the piper-assets release
# archive ships an older copy that does not list the Miko voice model.
#
# The model is pinned to a Hugging Face revision and verified by SHA-256.
# Run it after the piper-plus runtime assets are extracted into public/piper/.
#
# Usage: ./scripts/piper/fetch-miko-voice.sh

set -euo pipefail
cd "$(dirname "$0")/../.."

REPO_URL="https://huggingface.co/shinshin86/aituber-onair-miko-voice-piper-plus"
REVISION="b7db1788bcab3ccaec6d3b541ba6195edab48e1f"
MODEL_SHA256="20155a363e0a80ed425415d73c58c6f7559407b2ddca675811379719b45e5995"
CONFIG_SHA256="f1102d8a355d23c835b4f74316ea9f86455fbbeb8fc551681c012407c4f79002"
BASE_URL="$REPO_URL/resolve/$REVISION"

MODELS_DIR="public/piper/models"
LICENSES_DIR="public/piper/licenses"
LICENSE_TEMPLATE_DIR="scripts/piper/licenses"

mkdir -p "$MODELS_DIR" "$LICENSES_DIR"

download() {
  local source="$1" target="$2" expected="$3"
  if ! curl -fL --retry 3 -o "$target.tmp" "$BASE_URL/$source"; then
    rm -f "$target.tmp"
    echo "Error: failed to download $source" >&2
    exit 1
  fi
  local actual
  actual="$(shasum -a 256 "$target.tmp" | cut -d' ' -f1)"
  if [ "$actual" != "$expected" ]; then
    rm -f "$target.tmp"
    echo "Error: SHA-256 mismatch for $source (expected $expected, got $actual)" >&2
    exit 1
  fi
  mv "$target.tmp" "$target"
}

download "sample-voice-v2.onnx" "$MODELS_DIR/miko-sample-voice-v2.onnx" "$MODEL_SHA256"
download "sample-voice-v2.onnx.json" "$MODELS_DIR/miko-sample-voice-v2.onnx.json" "$CONFIG_SHA256"

for file in THIRD_PARTY_NOTICES.txt miko-voice-NOTICE.md piper-plus-base-model-MIT.txt piper-plus-base-model-NOTICE.md; do
  cp "$LICENSE_TEMPLATE_DIR/$file" "$LICENSES_DIR/$file"
done

echo "Prepared the Miko voice model in $MODELS_DIR"
