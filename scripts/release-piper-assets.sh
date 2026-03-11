#!/usr/bin/env bash
# public/piper/ を tar.gz 化し、GitHub Release asset として公開する。
# gh CLI で GitHub にログイン済みのローカル作業環境で実行する想定。
#
# Usage:
#   ./scripts/release-piper-assets.sh
#   ./scripts/release-piper-assets.sh piper-assets-v2
#   GITHUB_REPO=shinshin86/chrome-on-aituber ./scripts/release-piper-assets.sh

set -euo pipefail
cd "$(dirname "$0")/.."

OUTPUT="piper-assets.tar.gz"
TAG="${1:-piper-assets-v1}"
TITLE="${RELEASE_TITLE:-Piper TTS Assets}"

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

  local remote
  remote="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$remote" ]; then
    echo "Error: リポジトリ名を特定できません。GITHUB_REPO を指定してください。"
    exit 1
  fi

  remote="${remote%.git}"
  remote="${remote#git@github.com:}"
  remote="${remote#https://github.com/}"
  remote="${remote#http://github.com/}"

  if [ -z "$remote" ] || [ "$remote" = "$remote##*/" ]; then
    echo "Error: origin から owner/repo を解釈できません。GITHUB_REPO を指定してください。"
    exit 1
  fi

  printf '%s\n' "$remote"
}

require_command gh
require_command git

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh で GitHub にログインしていません。"
  echo "先に 'gh auth login' を実行してください。"
  exit 1
fi

REPO="$(detect_repo)"

./scripts/package-piper-assets.sh

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
echo "GitHub Actions の repository variable 'PIPER_ASSETS_URL' には次を設定してください:"
echo "  $ASSET_URL"
