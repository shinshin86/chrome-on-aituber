import { useI18n } from "../../i18n/useI18n";
import styles from "./Manual.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

function ManualBodyJa() {
  return (
    <>
      <section className={styles.section}>
        <h3>Chrome on AITuber とは？</h3>
        <p>
          ブラウザだけで動く AITuber チャットアプリです。
          Chrome の Built-in AI（Gemini Nano）で AI
          が日本語で会話し、音声合成（TTS）でアバターが読み上げます。
          サーバー不要で、すべてブラウザ内で完結します。
        </p>
        <p>
          音声合成には{" "}
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            piper-plus
          </a>{" "}
          （OpenJTalk + ONNX Runtime Web）を使用し、
          つくよみちゃんの音声モデルで日本語を読み上げます。
        </p>
      </section>

      <section className={styles.section}>
        <h3>1. Chrome の準備</h3>
        <p>
          <strong>Chrome 138 以降</strong>が必要です。以下の手順で Built-in AI
          を有効にしてください。
        </p>
        <ol>
          <li>
            アドレスバーに <code>chrome://flags</code> と入力
          </li>
          <li>
            <code>#optimization-guide-on-device-model</code> を「Enabled」に変更
          </li>
          <li>
            <code>#prompt-api-for-gemini-nano</code> を「Enabled」に変更
          </li>
          <li>Chrome を再起動</li>
          <li>
            モデルが未取得の場合は、アプリで <strong>AI を準備</strong>{" "}
            ボタンを押してダウンロードを開始
          </li>
        </ol>
        <p>
          Chrome の制約により、初回モデル準備の開始にはユーザー操作が必要です。
          ページを開いただけではダウンロードが始まらないことがあります。
        </p>
      </section>

      <section className={styles.section}>
        <h3>2. 音声合成（TTS）のセットアップ</h3>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
          ※ 公開サイトをご利用の場合、TTS
          はセットアップ済みのためこの手順は不要です。
          リポジトリをクローンしてローカルで実行する場合のみ必要です。
        </p>
        <p>
          音声読み上げには piper-plus WASM
          のアセットが必要です。以下の手順でファイルを取得し、
          <code>public/piper/</code> フォルダに配置してください。
        </p>

        <h4>2-1. piper-plus 本体（OpenJTalk WASM + JS モジュール）</h4>
        <p>
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            ayutaz/piper-plus
          </a>{" "}
          リポジトリの <code>dev</code> ブランチから取得します。
        </p>
        <ul>
          <li>
            <code>src/wasm/openjtalk-web/dist/</code> →{" "}
            <code>public/piper/dist/</code> にコピー（
            <code>openjtalk.js</code>, <code>openjtalk.wasm</code>）
          </li>
          <li>
            <code>src/wasm/openjtalk-web/src/</code> →{" "}
            <code>public/piper/src/</code> にコピー（JS モジュール群）
          </li>
          <li>
            <code>src/wasm/openjtalk-web/assets/</code> →{" "}
            <code>public/piper/assets/</code> にコピー（NAIST
            日本語辞書 + HTS 音声ファイル）
          </li>
        </ul>

        <h4>2-2. ONNX Runtime Web</h4>
        <p>
          <code>npm install onnxruntime-web</code>{" "}
          でインストールし、以下のファイルを{" "}
          <code>public/piper/dist/</code> にコピーしてください。
        </p>
        <ul>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort.min.js</code>
          </li>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort-wasm.wasm</code>
          </li>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm</code>
          </li>
        </ul>

        <h4>2-3. つくよみちゃん音声モデル</h4>
        <p>
          <a
            href="https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan"
            target="_blank"
            rel="noopener noreferrer"
          >
            ayousanz/piper-plus-tsukuyomi-chan
          </a>{" "}
          （Hugging Face）から以下をダウンロードし、
          <code>public/piper/models/</code> に配置してください。
        </p>
        <ul>
          <li>
            <code>tsukuyomi-wavlm-300epoch.onnx</code>（61MB）
          </li>
          <li>
            <code>config.json</code> →{" "}
            <code>tsukuyomi-config.json</code> にリネーム
          </li>
        </ul>

        <p>
          TTS アセットが未配置の場合でもチャット機能は利用できます（音声なし）。
        </p>
      </section>

      <section className={styles.section}>
        <h3>3. 基本的な使い方</h3>
        <ul>
          <li>
            初回起動時に <strong>AI を準備</strong>{" "}
            ボタンが出た場合は、最初に押して Gemini Nano のモデル準備を開始
          </li>
          <li>
            画面下部の入力欄にメッセージを入力し、<strong>Enter キー</strong>
            または送信ボタンで送信
          </li>
          <li>
            <strong>Shift + Enter</strong> で改行できます
          </li>
          <li>
            AI の応答はアバターの左側に、あなたのメッセージは右側に表示されます
          </li>
          <li>
            アバターは左ドラッグで移動、ホイールで拡大縮小、ダブルクリックで初期表示に戻せます。VRMは右ドラッグで回転できます
          </li>
          <li>
            設定パネルから背景画像を変更でき、チャットモードと配信モードの両方に反映されます
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3>4. ボタンの説明</h3>
        <ul>
          <li>
            <strong>❓</strong> — このマニュアルを表示
          </li>
          <li>
            <strong>&copy;</strong> — ライセンス情報を表示
          </li>
          <li>
            <strong>AI を準備</strong> — Gemini Nano の初回モデル準備を開始
          </li>
          <li>
            <strong>⚙</strong> —
            設定パネル（背景画像、音声 ON/OFF、会話リセット、システムプロンプト、読み上げ速度、YouTube Live 連携など）
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3>5. YouTube Live 連携</h3>
        <p>YouTube ライブ配信のコメントを AI に読ませることができます。</p>
        <ol>
          <li>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>{" "}
            で YouTube Data API v3 の API キーを取得
          </li>
          <li>設定パネルの「YouTube API Key」に入力</li>
          <li>
            「ライブ配信 ID」に配信 URL の <code>v=</code>{" "}
            以降の文字列を入力（例: <code>dQw4w9WgXcQ</code>）
          </li>
          <li>「YouTube Live コメント取得を有効にする」にチェック</li>
        </ol>
        <p>
          有効にすると、ライブチャットのコメントが定期的に取得され、AI
          がランダムに選んだコメントに返答します。
        </p>
      </section>

      <section className={styles.section}>
        <h3>6. クレジット</h3>
        <ul>
          <li>
            <a
              href="https://github.com/ayutaz/piper-plus"
              target="_blank"
              rel="noopener noreferrer"
            >
              piper-plus
            </a>{" "}
            — OpenJTalk WASM ベースの音声合成エンジン
          </li>
          <li>
            <a
              href="https://tyc.rei-yumesaki.net/material/corpus/"
              target="_blank"
              rel="noopener noreferrer"
            >
              つくよみちゃんコーパス
            </a>{" "}
            — 音声モデルの学習データ（CV.夢前黎）
          </li>
          <li>
            <a
              href="https://github.com/rhasspy/piper"
              target="_blank"
              rel="noopener noreferrer"
            >
              Piper TTS
            </a>{" "}
            — ニューラル音声合成フレームワーク
          </li>
          <li>
            <a
              href="https://onnxruntime.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ONNX Runtime Web
            </a>{" "}
            — ブラウザ上での ONNX モデル推論
          </li>
        </ul>
      </section>
    </>
  );
}

function ManualBodyEn() {
  return (
    <>
      <section className={styles.section}>
        <h3>What is Chrome on AITuber?</h3>
        <p>
          Chrome on AITuber is an AITuber chat app that runs entirely in the
          browser. Chrome Built-in AI (Gemini Nano) lets the AI chat, and
          text-to-speech (TTS) makes the avatar read responses aloud. No server
          is required; everything runs inside the browser.
        </p>
        <p>
          Speech synthesis uses{" "}
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            piper-plus
          </a>{" "}
          (OpenJTalk + ONNX Runtime Web) and reads Japanese aloud with the
          Tsukuyomi-chan voice model.
        </p>
      </section>

      <section className={styles.section}>
        <h3>1. Prepare Chrome</h3>
        <p>
          <strong>Chrome 138 or later</strong> is required. Enable Built-in AI
          with the steps below.
        </p>
        <ol>
          <li>
            Enter <code>chrome://flags</code> in the address bar
          </li>
          <li>
            Change <code>#optimization-guide-on-device-model</code> to
            "Enabled"
          </li>
          <li>
            Change <code>#prompt-api-for-gemini-nano</code> to "Enabled"
          </li>
          <li>Restart Chrome</li>
          <li>
            If the model has not been downloaded yet, press the{" "}
            <strong>Prepare AI</strong> button in the app to start the download
          </li>
        </ol>
        <p>
          Due to Chrome restrictions, starting the first model setup requires a
          user action. Opening the page alone may not start the download.
        </p>
      </section>

      <section className={styles.section}>
        <h3>2. Set up text-to-speech (TTS)</h3>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
          * If you are using the public site, TTS is already set up and this
          step is not required. It is only needed when you clone the repository
          and run it locally.
        </p>
        <p>
          Voice playback requires the piper-plus WASM assets. Get the files
          using the steps below and place them in the <code>public/piper/</code>{" "}
          folder.
        </p>

        <h4>2-1. piper-plus core (OpenJTalk WASM + JS modules)</h4>
        <p>
          Get the files from the <code>dev</code> branch of the{" "}
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            ayutaz/piper-plus
          </a>{" "}
          repository.
        </p>
        <ul>
          <li>
            Copy <code>src/wasm/openjtalk-web/dist/</code> to{" "}
            <code>public/piper/dist/</code> (<code>openjtalk.js</code>,{" "}
            <code>openjtalk.wasm</code>)
          </li>
          <li>
            Copy <code>src/wasm/openjtalk-web/src/</code> to{" "}
            <code>public/piper/src/</code> (JS modules)
          </li>
          <li>
            Copy <code>src/wasm/openjtalk-web/assets/</code> to{" "}
            <code>public/piper/assets/</code> (NAIST Japanese Dictionary + HTS
            voice files)
          </li>
        </ul>

        <h4>2-2. ONNX Runtime Web</h4>
        <p>
          Install it with <code>npm install onnxruntime-web</code>, then copy
          the following files to <code>public/piper/dist/</code>.
        </p>
        <ul>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort.min.js</code>
          </li>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort-wasm.wasm</code>
          </li>
          <li>
            <code>node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm</code>
          </li>
        </ul>

        <h4>2-3. Tsukuyomi-chan voice model</h4>
        <p>
          Download the following from{" "}
          <a
            href="https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan"
            target="_blank"
            rel="noopener noreferrer"
          >
            ayousanz/piper-plus-tsukuyomi-chan
          </a>{" "}
          (Hugging Face), then place them in{" "}
          <code>public/piper/models/</code>.
        </p>
        <ul>
          <li>
            <code>tsukuyomi-wavlm-300epoch.onnx</code> (61 MB)
          </li>
          <li>
            Rename <code>config.json</code> to{" "}
            <code>tsukuyomi-config.json</code>
          </li>
        </ul>

        <p>
          You can still use chat features if the TTS assets are not installed
          (without voice playback).
        </p>
      </section>

      <section className={styles.section}>
        <h3>3. Basic usage</h3>
        <ul>
          <li>
            If the <strong>Prepare AI</strong> button appears on first launch,
            press it first to start Gemini Nano model setup
          </li>
          <li>
            Type a message in the input field at the bottom of the screen and
            send it with the <strong>Enter key</strong> or the send button
          </li>
          <li>
            Use <strong>Shift + Enter</strong> to insert a newline
          </li>
          <li>
            AI responses appear on the left side of the avatar, and your
            messages appear on the right
          </li>
          <li>
            Left-drag to move the avatar, use the mouse wheel to zoom, and
            double-click to reset the view. Right-drag rotates VRM avatars
          </li>
          <li>
            You can change the background image from the settings panel, and it
            applies to both chat mode and broadcast mode
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3>4. Buttons</h3>
        <ul>
          <li>
            <strong>❓</strong> — Show this manual
          </li>
          <li>
            <strong>&copy;</strong> — Show license information
          </li>
          <li>
            <strong>Prepare AI</strong> — Start Gemini Nano's first model setup
          </li>
          <li>
            <strong>⚙</strong> — Settings panel (background image, voice
            ON/OFF, conversation reset, system prompt, speech speed, YouTube
            Live integration, and more)
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3>5. YouTube Live integration</h3>
        <p>You can have the AI read comments from a YouTube live stream.</p>
        <ol>
          <li>
            Get an API key for YouTube Data API v3 in{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
          </li>
          <li>Enter it in "YouTube API Key" in the settings panel</li>
          <li>
            In "Live stream ID", enter the part after <code>v=</code> in the
            stream URL (example: <code>dQw4w9WgXcQ</code>)
          </li>
          <li>Check "Enable YouTube Live comments"</li>
        </ol>
        <p>
          When enabled, live chat comments are fetched periodically, and the AI
          replies to a randomly selected comment.
        </p>
      </section>

      <section className={styles.section}>
        <h3>6. Credits</h3>
        <ul>
          <li>
            <a
              href="https://github.com/ayutaz/piper-plus"
              target="_blank"
              rel="noopener noreferrer"
            >
              piper-plus
            </a>{" "}
            — OpenJTalk WASM-based speech synthesis engine
          </li>
          <li>
            <a
              href="https://tyc.rei-yumesaki.net/material/corpus/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tsukuyomi-chan Corpus
            </a>{" "}
            — Training data for the voice model (CV: Rei Yumesaki)
          </li>
          <li>
            <a
              href="https://github.com/rhasspy/piper"
              target="_blank"
              rel="noopener noreferrer"
            >
              Piper TTS
            </a>{" "}
            — Neural speech synthesis framework
          </li>
          <li>
            <a
              href="https://onnxruntime.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ONNX Runtime Web
            </a>{" "}
            — ONNX model inference in the browser
          </li>
        </ul>
      </section>
    </>
  );
}

export function ManualDialog({ open, onClose }: Props) {
  const { language, t } = useI18n();

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{t("manual.title")}</h2>

        {language === "en" ? <ManualBodyEn /> : <ManualBodyJa />}

        <button className={styles.closeBtn} onClick={onClose}>
          {t("manual.close")}
        </button>
      </div>
    </div>
  );
}
