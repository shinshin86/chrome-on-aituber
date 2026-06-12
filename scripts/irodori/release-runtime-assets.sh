#!/usr/bin/env bash
# Irodori ランタイム tar.gz を GitHub Release asset として公開する。
# gh CLI で GitHub にログイン済みのローカル作業環境で実行する想定。
#
# Usage:
#   ./scripts/irodori/release-runtime-assets.sh
#   ./scripts/irodori/release-runtime-assets.sh irodori-runtime-v2
#   GITHUB_REPO=<owner>/<repo> ./scripts/irodori/release-runtime-assets.sh

set -euo pipefail
cd "$(dirname "$0")/../.."

OUTPUT="irodori-runtime-assets.tar.gz"
TAG="${1:-irodori-runtime-v1}"
TITLE="${RELEASE_TITLE:-Irodori TTS Runtime Assets}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' コマンドが見つかりません。"
    exit 1
  fi
}

detect_repo() {
  if [ -n "${GITHUB_REPO:-}" ]; then
    printf '%s\n' "$GITHUB_REPO"
    return
  fi

  if gh repo view --json nameWithOwner -q .nameWithOwner >/dev/null 2>&1; then
    gh repo view --json nameWithOwner -q .nameWithOwner
    return
  fi

  echo "Error: リポジトリ名を特定できません。GITHUB_REPO を指定してください。"
  exit 1
}

require_command gh

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh で GitHub にログインしていません。"
  echo "先に 'gh auth login' を実行してください。"
  exit 1
fi

REPO="$(detect_repo)"

./scripts/irodori/package-runtime-assets.sh

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "Release '$TAG' は既に存在するため、asset を上書きアップロードします。"
  gh release upload "$TAG" "$OUTPUT" --repo "$REPO" --clobber
else
  echo "Release '$TAG' を新規作成して asset をアップロードします。"
  gh release create "$TAG" "$OUTPUT" --repo "$REPO" --title "$TITLE"
fi

ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/${OUTPUT}"

echo ""
echo "完了:"
echo "  Release: $REPO / $TAG"
echo "  Asset URL: $ASSET_URL"
echo ""
echo "GitHub Actions の repository variable 'IRODORI_RUNTIME_ASSETS_URL' には次を設定してください:"
echo "  $ASSET_URL"
