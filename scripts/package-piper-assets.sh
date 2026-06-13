#!/usr/bin/env bash
# public/piper/ 配下のアセットを tar.gz にパッケージ化する。
# GitHub Releases にアップロードして CI でダウンロードする用途。
# ローカルのビルド/リリース作業環境で実行する想定。
#
# Usage: ./scripts/package-piper-assets.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PIPER_DIR="public/piper"
LICENSE_TEMPLATE_DIR="scripts/piper/licenses"
OUTPUT="piper-assets.tar.gz"

if [ ! -d "$PIPER_DIR" ]; then
  echo "Error: $PIPER_DIR が見つかりません。"
  echo "先に piper アセットを配置してください。"
  exit 1
fi

if [ ! -d "$LICENSE_TEMPLATE_DIR" ]; then
  echo "Error: $LICENSE_TEMPLATE_DIR が見つかりません。"
  echo "Piper アセットのライセンス文テンプレートを確認してください。"
  exit 1
fi

rm -rf "$PIPER_DIR/licenses"
mkdir -p "$PIPER_DIR/licenses"
cp -R "$LICENSE_TEMPLATE_DIR"/. "$PIPER_DIR/licenses"/

tar -czf "$OUTPUT" -C public piper/
echo "Created $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
echo "Included license files:"
find "$PIPER_DIR/licenses" -type f -print | sort
echo ""
echo "次のステップ:"
echo "  1. GitHub Release を作成して $OUTPUT をアップロード"
echo "     gh release create piper-assets-v1 $OUTPUT --title 'Piper TTS Assets'"
echo "  2. .github/workflows/deploy.yml の PIPER_ASSETS_URL を更新"
