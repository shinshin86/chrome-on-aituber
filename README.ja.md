# Chrome on AITuber

React + Vite で構成された、ブラウザ完結型の AITuber チャットアプリです。Chrome Built-in AI（Gemini Nano / Prompt API）で日本語応答を生成し、piper-plus WASM で音声合成し、4 枚スプライトのアバターを口パクとまばたき付きで表示します。

[English README](./README.md)

## 機能

- アプリケーションサーバー不要のブラウザ完結動作
- Chrome Built-in AI / `LanguageModel` による日本語チャット
- piper-plus WASM + OpenJTalk + ONNX Runtime Web による音声合成
- 4 枚スプライトのアバター表示、口パク、ランダムまばたき
- 背景画像の変更とデフォルト背景への復帰
- チャットモードと配信モード（グリーンバック）の 2 表示モード
- YouTube Data API v3 を使った YouTube Live コメント取得
- EventSub WebSocket + OAuth implicit flow を使った Twitch コメント取得
- 4 枚画像アップロードによるカスタムアバター登録
- `localStorage` への設定・会話履歴保存
- `IndexedDB` へのカスタムアバター保存

## 必要環境

- Google Chrome 138 以降
- Node.js 18 以降
- `npm`

AI 応答を使うには、事前に Chrome Built-in AI を有効化してください。

1. `chrome://flags` を開く
2. `#optimization-guide-on-device-model` を有効化
3. `#prompt-api-for-gemini-nano` を有効化
4. Chrome を再起動
5. オンデバイスモデルのダウンロード完了を待つ

初回起動時にモデルがまだ端末へ入っていない場合、Chrome の制約でモデル準備の開始にはユーザー操作が必要です。アプリ上に表示される `AI を準備` ボタンを押してから利用してください。

## セットアップ

1. リポジトリを clone して依存関係を入れる

```bash
git clone https://github.com/shinshin86/chrome-on-aituber.git
cd chrome-on-aituber
npm install
```

2. 音声を使いたい場合は TTS アセットを配置する

piper TTS の完全なアセット一式は、このリポジトリにはコミットされていません。自分で clone して起動する場合は、必要なファイルを `public/piper/` 配下に配置する必要があります。

Git 管理されているのは次のみです。

- `public/piper/piper-global-loader.js`

それ以外の `public/piper/` 一式は利用者側で別途用意する必要があります。これらがない場合でもチャット画面は開けますが、TTS は正常動作しません。

次の手順でアセットを用意してください。

1. [ayutaz/piper-plus](https://github.com/ayutaz/piper-plus) から `piper-plus` を取得
   `dev` ブランチを clone またはダウンロードし、次をコピーします。
   - `src/wasm/openjtalk-web/dist/` -> `public/piper/dist/`
   - `src/wasm/openjtalk-web/src/` -> `public/piper/src/`
   - `src/wasm/openjtalk-web/assets/` -> `public/piper/assets/`
2. [onnxruntime-web の npm ページ](https://www.npmjs.com/package/onnxruntime-web) から `onnxruntime-web` を取得
   次のファイルを `public/piper/dist/` に配置します。
   - `dist/ort.min.js`
   - `dist/ort-wasm.wasm`
   - `dist/ort-wasm-simd.wasm`
3. [ayousanz/piper-plus-tsukuyomi-chan](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan) から音声モデルを取得
   次のファイルを `public/piper/models/` に配置します。
   - `tsukuyomi-wavlm-300epoch.onnx`
   - `config.json` を `tsukuyomi-config.json` にリネームしたもの
4. ライセンス表記
   `scripts/package-piper-assets.sh` は、パッケージ前に `scripts/piper/licenses/` のテンプレートを `public/piper/licenses/` にコピーします。手動で `public/piper/` を組み立てる場合も、このディレクトリを同梱してください。

Piper 音声モデルのクレジット:

> 本ソフトウェアの音声合成には、フリー素材キャラクター「つくよみちゃん」(c) Rei Yumesaki が無料公開している音声データを使用しています。
>
> つくよみちゃんコーパス（CV.夢前黎）<br>
> https://tyc.rei-yumesaki.net/material/corpus/

`scripts/package-piper-assets.sh` はセットアップ用スクリプトではなく、すでに用意済みの `public/piper/` にライセンステンプレートをコピーした上で `piper-assets.tar.gz` に固めて GitHub Releases / CI 配布に使うためのものです。`scripts/release-piper-assets.sh` はさらに GitHub Release へのアップロードまで自動化します。

どちらも `gh` で GitHub にログイン済みのローカル作業環境で使う想定です。

このパッケージ化フローを使う場合は、次を実行してください。

```bash
./scripts/package-piper-assets.sh
./scripts/release-piper-assets.sh
```

既存の `piper-assets-v1` release asset には `piper/licenses/` が含まれていません。このテンプレート込みで tarball を作り直した後は、新しい release asset を公開し、GitHub Actions の repository variable `PIPER_ASSETS_URL` を新しい URL に更新してください。

Irodori TTS を使う場合は、別途 `public/irodori/` に Irodori 用の `manifest.json`、WebGPU 向け fp16 ONNX モデル、tokenizer、`runtime/pipeline.mjs`、ライセンス文を配置します。このディレクトリは Git 管理対象外です。組み上げ手順は [`scripts/irodori/`](scripts/irodori/README.md) にあります。

デプロイ先では、アセット一式（約 1.3GB）が GitHub Pages のサイト上限を超えること、および GitHub Release asset には CORS ヘッダが付かないことから、Irodori アセットは二分割でホスティングします。ランタイム（`pipeline.mjs` + ONNX Runtime wasm。dynamic `import()` に JavaScript の MIME タイプが必要なため同一オリジン配信）は GitHub Release の tarball としてビルド時に展開され（`IRODORI_RUNTIME_ASSETS_URL`）、モデルと tokenizer はブラウザが公開 Hugging Face リポジトリから直接ダウンロードします（`IRODORI_ASSETS_BASE_URL` → `VITE_IRODORI_ASSETS_BASE_URL`）。どちらの repository variable も任意で、未設定時は同一オリジンの `irodori/` に fallback します。リリース手順は [`scripts/irodori/README.md`](scripts/irodori/README.md) を参照してください。

アプリ上で `Irodori TTS モデルをダウンロード` を押すと、モデル一式はブラウザストレージ（主に IndexedDB）に保存されます。現在の fp16 アセット一式は約 1.2 GiB です。通常ウィンドウでは、設定画面の `モデルを削除して容量を解放` を押すか、Chrome のサイトデータを削除するまで残ります。シークレットモードでは、そのシークレットセッション用の一時保存になり、すべてのシークレットウィンドウを閉じると Web アプリからは参照できなくなります。また、シークレットモードは保存容量の上限が通常ウィンドウより小さくなることがあり、モデル保存が `QuotaExceededError` で失敗する場合があります。参照音声としてアップロードした `.wav` / `.mp3` は永続保存されず、セッション内のメモリ上でのみ使われます。

3. 開発サーバーを起動する

```bash
npm run dev
```

Chrome で Vite の URL（通常は `http://localhost:5173`）を開いてください。

## 使い方

- 画面下の入力欄にテキストを入れて `Enter` で送信
- 初回のみ、必要に応じて `AI を準備` を押して Gemini Nano のモデル準備を開始
- 改行は `Shift+Enter`
- 下部バーから設定パネルを開く
- `Ctrl+S` / `Cmd+S` で設定パネルを素早く開閉
- 配信モードに切り替えると、中央アバターのみのグリーンバック表示
- 設定パネルから会話リセット、TTS の ON/OFF、読み上げ速度変更が可能
- 設定パネルから背景画像を変更でき、`デフォルトに戻す` で元の背景に戻せる
- カスタムアバターは 4 枚の画像を登録して追加可能
  - 口閉じ・目開き
  - 口閉じ・目閉じ
  - 口開き・目開き
  - 口開き・目閉じ

## 配信コメント連携

### YouTube Live

設定パネルで次を設定します。

- `YouTube API Key`
- `ライブ配信 ID`
- コメント取得間隔
- 有効化チェック

`ライブ配信 ID` は YouTube 配信 URL の動画 ID です。例:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` -> `dQw4w9WgXcQ`

ブラウザから直接ライブチャットを取得し、重複や古いコメントを除外したうえで、1 件を選んで AI に渡します。

### Twitch

設定パネルで次を設定します。

- `Twitch Client ID`
- チャンネル名
- コメント取得間隔

その後 `Twitch に接続` を押して OAuth を完了すると、ブラウザ内でアクセストークンを保持し、EventSub WebSocket の `channel.chat.message` を購読します。

## ビルド

```bash
npm run build
npm run preview
```

Vite の開発サーバーでは、すでに次のヘッダーを返しています。

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

本番ホスティングでも、WASM / `SharedArrayBuffer` のために同じヘッダー設定が必要です。

## プロジェクト構成

```text
src/
├── components/
│   ├── Avatar/
│   ├── Chat/
│   ├── License/
│   ├── Manual/
│   ├── Settings/
│   └── Toast/
├── hooks/
│   ├── useBlink.ts
│   ├── useChat.ts
│   ├── useInterval.ts
│   ├── useSettings.ts
│   ├── useTwitchComments.ts
│   └── useYoutubeComments.ts
├── services/
│   ├── avatar/
│   ├── llm/
│   ├── storage/
│   ├── tts/
│   ├── twitch/
│   └── youtube/
└── types/
```

## 補足

- 設定、会話履歴、API キー、Twitch アクセストークンはローカルブラウザに保存されます。
- Irodori TTS のダウンロード済みモデルはブラウザストレージに保存されるため、保存容量を約 1.2 GiB 使用します。
- シークレットモードでは保存容量の上限が小さくなる場合があるため、Irodori TTS のモデル保存には通常ウィンドウの利用を推奨します。
