#!/usr/bin/env bash
# public/irodori/ の中身（モデル・tokenizer・runtime・licenses・manifest）を
# Hugging Face Hub のモデルリポジトリへアップロードする。
# ブラウザはここから直接ダウンロードする（HF は CORS 対応・公開リポジトリは無料）。
#
# 事前に: hf auth login（write 権限トークン）
#
# Usage:
#   ./scripts/irodori/release-assets-hf.sh <user>/<repo>
#   例: ./scripts/irodori/release-assets-hf.sh myname/chrome-on-aituber-irodori-assets

set -euo pipefail
cd "$(dirname "$0")/../.."

REPO_ID="${1:-${IRODORI_HF_REPO:-}}"
IRODORI_DIR="public/irodori"
MODEL_CARD="scripts/irodori/hf-model-card.md"

if [ -z "$REPO_ID" ]; then
  echo "Usage: $0 <hf-user>/<repo>"
  echo "  例: $0 myname/chrome-on-aituber-irodori-assets"
  exit 1
fi

if command -v hf >/dev/null 2>&1; then
  HF=hf
elif command -v huggingface-cli >/dev/null 2>&1; then
  HF=huggingface-cli
else
  echo "Error: hf CLI が見つかりません。次でインストールしてください:"
  echo "  uv tool install 'huggingface_hub[cli]'  または  pip install -U 'huggingface_hub[cli]'"
  exit 1
fi

if ! "$HF" auth whoami >/dev/null 2>&1; then
  echo "Error: Hugging Face にログインしていません。"
  echo "先に '$HF auth login' を実行してください（write 権限トークン）。"
  exit 1
fi

if [ ! -f "$IRODORI_DIR/manifest.json" ]; then
  echo "Error: $IRODORI_DIR/manifest.json が見つかりません。"
  echo "先に scripts/irodori/package-assets.mjs で public/irodori を組み立ててください。"
  exit 1
fi

echo "リポジトリを作成します（既に存在する場合はそのまま使います）: $REPO_ID"
"$HF" repo create "$REPO_ID" --repo-type model 2>/dev/null || true

echo "モデルカードをアップロードします..."
"$HF" upload "$REPO_ID" "$MODEL_CARD" README.md --repo-type model \
  --commit-message "Update model card"

echo "アセット一式をアップロードします（約 1.3GB、初回は時間がかかります）..."
"$HF" upload "$REPO_ID" "$IRODORI_DIR" . --repo-type model \
  --commit-message "Upload Irodori TTS WebGPU assets"

BASE_URL="https://huggingface.co/${REPO_ID}/resolve/main/"

echo ""
echo "完了:"
echo "  Repo: https://huggingface.co/${REPO_ID}"
echo ""
echo "GitHub Actions の repository variable 'IRODORI_ASSETS_BASE_URL' には次を設定してください:"
echo "  $BASE_URL"
echo ""
echo "ローカルで確認する場合は .env.local に:"
echo "  VITE_IRODORI_ASSETS_BASE_URL=$BASE_URL"
