# Chrome on AITuber

ブラウザ完結型の AITuber チャットアプリです。Gemini Nano（Chrome Built-in AI / Prompt API）で LLM 応答を生成し、piper-plus WASM で日本語 TTS を行い、アバターの口パクアニメーションと同期させます。

**技術スタック**: TypeScript / React / Vite SPA

---

## 機能

- **LLM チャット** — Chrome Built-in AI（LanguageModel API、Chrome 138+）による日本語対話
- **TTS 音声合成** — piper-plus WASM（OpenJTalk + ONNX Runtime Web）による日本語読み上げ
- **アバター** — 4 枚スプライトアニメーション（口開閉 x 目開閉）+ ランダムまばたき
- **チャット UI** — 3 カラムレイアウト（AI メッセージ / アバター / ユーザーメッセージ）
- **設定** — システムプロンプト編集、TTS 読み上げ速度調整
- **ローカル保存** — 全データをローカルに保存（LocalStorage + IndexedDB）、サーバー不要

## 必要環境

- **Google Chrome 138+**（Built-in AI / Prompt API 有効化済み）
  - `chrome://flags` で `#optimization-guide-on-device-model` と `#prompt-api-for-gemini-nano` を有効化
  - Chrome を再起動し、モデルのダウンロード完了を待つ
- **Node.js 18+**

## セットアップ

### 1. クローンと依存パッケージのインストール

```bash
git clone https://github.com/<your-username>/chrome-on-aituber.git
cd chrome-on-aituber
npm install
```

### 2. piper-plus WASM アセットの配置

TTS エンジンに必要な piper-plus WASM アセットはファイルサイズが大きいため、リポジトリには含まれていません。以下のファイルを `public/piper/` に配置してください。

```
public/piper/
├── piper-global-loader.js      # ES module ローダー（下記参照）
├── dist/
│   ├── openjtalk.js             # OpenJTalk JS ラッパー
│   ├── openjtalk.wasm           # OpenJTalk WASM バイナリ
│   ├── ort.min.js               # ONNX Runtime Web
│   ├── ort-wasm.wasm            # ONNX Runtime WASM
│   └── ort-wasm-simd.wasm       # ONNX Runtime WASM (SIMD)
├── src/
│   ├── simple_unified_api.js    # piper-plus 統合 API
│   ├── phonemizer.js
│   ├── openjtalk_wrapper.js
│   ├── japanese_phoneme_extract.js
│   ├── dictionary-loader.js
│   ├── custom_dictionary.js
│   ├── simple_english_phonemizer.js
│   └── api.js
├── assets/
│   ├── dict/                    # OpenJTalk 用 NAIST 日本語辞書
│   │   ├── sys.dic, unk.dic, char.bin, matrix.bin, ...
│   │   └── COPYING
│   └── voice/
│       └── mei_normal.htsvoice  # HTS 音声ファイル
└── models/
    ├── tsukuyomi-config.json    # モデル設定（phoneme_id_map 等）
    └── tsukuyomi-wavlm-300epoch.onnx  # TTS ONNX モデル
```

**入手先:**

- **ONNX Runtime Web**: [ONNX Runtime リリース](https://github.com/nicl-nno/onnxruntime-web-demo/releases)からダウンロード、または `npm install onnxruntime-web` でインストール後 `dist/` から `ort.min.js`, `ort-wasm.wasm`, `ort-wasm-simd.wasm` をコピー
- **OpenJTalk WASM**: [piper-plus](https://github.com/nicl-nno/piper-plus) からビルド、またはビルド済みアセットを使用
- **NAIST 辞書**: OpenJTalk のビルドに同梱
- **つくよみちゃん音声モデル**: piper-plus モデルリポジトリからダウンロード

`piper-global-loader.js` はリポジトリに同梱済みです。上記のファイルを配置するだけで動作します。

### 3. 開発サーバーの起動

```bash
npm run dev
```

Chrome でターミナルに表示された URL（デフォルト: `http://localhost:5173`）を開いてください。

## ビルド

```bash
npm run build
npm run preview
```

> **注意**: 本番ビルドでも WASM の SharedArrayBuffer サポートのため COOP/COEP ヘッダー（`Cross-Origin-Opener-Policy: same-origin`、`Cross-Origin-Embedder-Policy: require-corp`）が必要です。ホスティング環境で設定してください。

## プロジェクト構成

```
src/
├── components/
│   ├── Avatar/       # アバタースプライト表示 + まばたきアニメーション
│   ├── Chat/         # チャット UI（ChatLog, ChatMessage, ChatInput, BottomBar）
│   └── Settings/     # 設定モーダルパネル
├── hooks/
│   ├── useBlink.ts   # ランダムまばたき用フック
│   ├── useChat.ts    # コアチャットロジック（LLM + TTS 統合）
│   └── useSettings.ts
├── services/
│   ├── avatar/       # アバターパック管理
│   ├── llm/          # Chrome Built-in AI ラッパー
│   ├── storage/      # LocalStorage + IndexedDB 永続化
│   ├── tts/          # piper-plus WASM TTS エンジン
│   └── youtube/      # YouTube ライブチャット連携（スタブ）
└── types/            # TypeScript 型定義
```

## ライセンス

TBD

---

[English README](./README.md)
