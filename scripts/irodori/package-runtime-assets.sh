#!/usr/bin/env bash
# public/irodori/ のうちランタイム部分（runtime/ と licenses/）だけを tar.gz 化する。
# pipeline.mjs と ort-wasm ローダーは dynamic import に正しい JavaScript MIME が
# 必要なため、外部ホスティングではなく GitHub Pages（同一オリジン）から配信する。
# モデル本体は scripts/irodori/release-assets-hf.sh で Hugging Face に置く。
#
# Usage: ./scripts/irodori/package-runtime-assets.sh

set -euo pipefail
cd "$(dirname "$0")/../.."

IRODORI_DIR="public/irodori"
OUTPUT="irodori-runtime-assets.tar.gz"

for dir in "$IRODORI_DIR/runtime" "$IRODORI_DIR/licenses"; do
  if [ ! -d "$dir" ]; then
    echo "Error: $dir が見つかりません。"
    echo "先に scripts/irodori/package-assets.mjs で public/irodori を組み立ててください。"
    exit 1
  fi
done

for f in pipeline.mjs \
  ort-wasm-simd-threaded.asyncify.mjs ort-wasm-simd-threaded.asyncify.wasm \
  ort-wasm-simd-threaded.jsep.mjs ort-wasm-simd-threaded.jsep.wasm; do
  if [ ! -f "$IRODORI_DIR/runtime/$f" ]; then
    echo "Error: $IRODORI_DIR/runtime/$f が見つかりません。"
    exit 1
  fi
done

tar -czf "$OUTPUT" -C public irodori/runtime irodori/licenses
echo "Created $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
