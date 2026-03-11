import styles from "./Manual.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManualDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>使い方マニュアル</h2>

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
              モデルのダウンロードが自動で始まります（画面上部のステータスバーで進捗を確認できます）
            </li>
          </ol>
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
              画面下部の入力欄にメッセージを入力し、<strong>Enter キー</strong>
              または送信ボタンで送信
            </li>
            <li>
              <strong>Shift + Enter</strong> で改行できます
            </li>
            <li>
              AI の応答はアバターの左側に、あなたのメッセージは右側に表示されます
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
              <strong>⚙</strong> —
              設定パネル（音声 ON/OFF、会話リセット、システムプロンプト、読み上げ速度、YouTube Live 連携など）
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
                href="https://tyc.rei-yumesaki.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                つくよみちゃんコーパス
              </a>{" "}
              — 音声モデルの学習データ（夢前黎 様）
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

        <button className={styles.closeBtn} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
