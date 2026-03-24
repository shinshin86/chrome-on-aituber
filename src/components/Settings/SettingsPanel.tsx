import { useRef, useState } from "react";
import { CHAT_SOURCE_LABELS } from "../../types";
import type { AppSettings, AppMode, ChatMessage, StreamingPlatform } from "../../types";
import { AvatarSettings } from "./AvatarSettings";
import styles from "./Settings.module.css";

interface Props {
  settings: AppSettings;
  messages: ChatMessage[];
  assistantLabel: string;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onUploadBackgroundImage: (file: File) => Promise<void>;
  onResetBackgroundImage: () => Promise<void>;
  onExportMessages: () => void;
  open: boolean;
  onClose: () => void;
  onReset: () => void;
}

const PLATFORM_OPTIONS: { value: StreamingPlatform; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "twitch", label: "Twitch" },
];

const MODE_OPTIONS: { value: AppMode; label: string }[] = [
  { value: "chat", label: "チャットモード" },
  { value: "broadcast", label: "配信モード（グリーンバック）" },
];

const INTERVAL_OPTIONS = [
  { value: 10000, label: "10秒" },
  { value: 15000, label: "15秒" },
  { value: 20000, label: "20秒（推奨）" },
  { value: 30000, label: "30秒" },
  { value: 60000, label: "60秒" },
];

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}

function formatSourceLabel(message: ChatMessage): string {
  return message.source ? CHAT_SOURCE_LABELS[message.source] : "不明";
}

function createOauthState(): string {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SettingsPanel({
  settings,
  messages,
  assistantLabel,
  onUpdate,
  onUploadBackgroundImage,
  onResetBackgroundImage,
  onExportMessages,
  open,
  onClose,
  onReset,
}: Props) {
  const [twitchConnectError, setTwitchConnectError] = useState("");
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [backgroundError, setBackgroundError] = useState("");
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const twitchRedirectUri =
    typeof window === "undefined"
      ? ""
      : new URL(window.location.pathname, window.location.origin).toString();

  async function handleBackgroundChange(file: File | null) {
    if (!file || backgroundBusy) return;

    setBackgroundBusy(true);
    setBackgroundError("");

    try {
      await onUploadBackgroundImage(file);
    } catch (e) {
      setBackgroundError(
        e instanceof Error ? e.message : "背景画像の保存に失敗しました"
      );
    } finally {
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = "";
      }
      setBackgroundBusy(false);
    }
  }

  async function handleResetBackground() {
    if (!settings.backgroundImageEnabled || backgroundBusy) return;

    setBackgroundBusy(true);
    setBackgroundError("");

    try {
      await onResetBackgroundImage();
    } catch (e) {
      setBackgroundError(
        e instanceof Error ? e.message : "背景画像のリセットに失敗しました"
      );
    } finally {
      setBackgroundBusy(false);
    }
  }

  function handleDeleteMessages() {
    if (messages.length === 0) return;

    const confirmed = window.confirm(
      "保存されているチャットログを削除します。よろしいですか？"
    );

    if (!confirmed) return;

    onReset();
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>設定</h2>

        {/* 表示モード */}
        <details className={styles.section}>
          <summary>表示モード</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              <select
                className={styles.textInput}
                value={settings.appMode}
                onChange={(e) =>
                  onUpdate({ appMode: e.target.value as AppMode })
                }
              >
                {MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {settings.appMode === "broadcast" && (
                <span className={styles.hint}>
                  配信モード中は <kbd>Ctrl</kbd>+<kbd>S</kbd>{" "}
                  でこの設定を開けます
                </span>
              )}
            </label>
          </div>
        </details>

        <details className={styles.section}>
          <summary>背景</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              背景画像
              <span className={styles.hint}>
                設定した画像はチャットモードと配信モードの両方に表示されます
              </span>
            </label>

            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                void handleBackgroundChange(e.target.files?.[0] ?? null)
              }
            />

            <div className={styles.actionRow}>
              <button
                className={styles.subActionBtn}
                type="button"
                disabled={backgroundBusy}
                onClick={() => backgroundInputRef.current?.click()}
              >
                {backgroundBusy
                  ? "保存中..."
                  : settings.backgroundImageEnabled
                    ? "背景画像を変更"
                    : "背景画像を選択"}
              </button>

              <button
                className={styles.secondaryBtn}
                type="button"
                disabled={!settings.backgroundImageEnabled || backgroundBusy}
                onClick={() => void handleResetBackground()}
              >
                デフォルトに戻す
              </button>
            </div>

            <span className={styles.hint}>
              {settings.backgroundImageEnabled
                ? "現在はカスタム背景を表示中です"
                : "現在はデフォルト背景です"}
            </span>

            {backgroundError && (
              <div className={styles.errorText}>{backgroundError}</div>
            )}
          </div>
        </details>

        {/* アバター設定 */}
        <details className={styles.section}>
          <summary>アバター設定</summary>
          <div className={styles.sectionContent}>
            <AvatarSettings
              selectedAvatarId={settings.selectedAvatarId}
              onSelectAvatar={(id) => onUpdate({ selectedAvatarId: id })}
            />
          </div>
        </details>

        {/* AI / 音声 */}
        <details className={styles.section}>
          <summary>AI / 音声</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              システムプロンプト
              <textarea
                className={styles.textarea}
                value={settings.llmSystemPrompt}
                onChange={(e) =>
                  onUpdate({ llmSystemPrompt: e.target.value })
                }
                rows={4}
              />
            </label>

            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.ttsEnabled}
                onChange={(e) =>
                  onUpdate({ ttsEnabled: e.target.checked })
                }
              />
              音声読み上げ（TTS）を有効にする
            </label>

            <label className={styles.label}>
              読み上げ速度 ({settings.ttsLengthScale.toFixed(1)}x)
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.ttsLengthScale}
                onChange={(e) =>
                  onUpdate({
                    ttsLengthScale: parseFloat(e.target.value),
                  })
                }
              />
            </label>

          </div>
        </details>

        <details className={styles.section}>
          <summary>チャットログ</summary>
          <div className={styles.sectionContent}>
            <p className={styles.hint}>
              保存件数: {messages.length}件
            </p>

            <div className={styles.chatLogViewer}>
              {messages.length === 0 ? (
                <p className={styles.chatLogEmpty}>
                  まだチャットログはありません
                </p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={styles.chatLogItem}>
                    <div className={styles.chatLogMeta}>
                      <span className={styles.chatLogRole}>
                        {message.role === "assistant" ? assistantLabel : "USER"}
                      </span>
                      <span className={styles.chatLogSource}>
                        {formatSourceLabel(message)}
                      </span>
                      <span>{formatDateTime(message.timestamp)}</span>
                      {message.senderName && (
                        <span className={styles.chatLogSender}>
                          {message.senderName}
                        </span>
                      )}
                    </div>
                    <p className={styles.chatLogText}>{message.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className={styles.actionRow}>
              <button
                className={styles.secondaryBtn}
                type="button"
                disabled={messages.length === 0}
                onClick={onExportMessages}
              >
                CSV をエクスポート
              </button>
              <button
                className={styles.resetBtn}
                type="button"
                disabled={messages.length === 0}
                onClick={handleDeleteMessages}
              >
                チャットログを削除
              </button>
            </div>
          </div>
        </details>

        {/* 配信チャット連携 */}
        <details className={styles.section}>
          <summary>配信チャット連携</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              プラットフォーム
              <select
                className={styles.textInput}
                value={settings.streamingPlatform}
                onChange={(e) =>
                  onUpdate({
                    streamingPlatform: e.target.value as StreamingPlatform,
                  })
                }
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {settings.streamingPlatform === "youtube" && (
              <>
                <label className={styles.label}>
                  YouTube API Key
                  <input
                    className={styles.textInput}
                    type="password"
                    value={settings.youtubeApiKey}
                    onChange={(e) =>
                      onUpdate({ youtubeApiKey: e.target.value })
                    }
                    placeholder="xxx..."
                  />
                </label>

                <label className={styles.label}>
                  ライブ配信 ID
                  <input
                    className={styles.textInput}
                    type="text"
                    value={settings.youtubeLiveId}
                    onChange={(e) =>
                      onUpdate({ youtubeLiveId: e.target.value })
                    }
                    placeholder="xxx..."
                  />
                </label>

                <label className={styles.label}>
                  コメント取得間隔
                  <select
                    className={styles.textInput}
                    value={settings.youtubeCommentInterval}
                    onChange={(e) =>
                      onUpdate({
                        youtubeCommentInterval: parseInt(e.target.value),
                      })
                    }
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.youtubeEnabled}
                    onChange={(e) =>
                      onUpdate({ youtubeEnabled: e.target.checked })
                    }
                  />
                  YouTube Live コメント取得を有効にする
                </label>
              </>
            )}

            {settings.streamingPlatform === "twitch" && (
              <>
                <label className={styles.label}>
                  Twitch Client ID
                  <input
                    className={styles.textInput}
                    type="password"
                    value={settings.twitchClientId}
                    onChange={(e) =>
                      onUpdate({ twitchClientId: e.target.value })
                    }
                    placeholder="Client ID..."
                  />
                </label>

                {settings.twitchAccessToken ? (
                  <div className={styles.label}>
                    <span style={{ color: "#4caf50", fontWeight: 600 }}>
                      Twitch 接続済み
                    </span>
                    <button
                      className={styles.closeBtn}
                      type="button"
                      style={{
                        background: "#e53935",
                        marginTop: 4,
                      }}
                      onClick={() =>
                        onUpdate({ twitchAccessToken: "" })
                      }
                    >
                      切断
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.closeBtn}
                    type="button"
                    style={{ marginTop: 0, marginBottom: 16 }}
                    disabled={!settings.twitchClientId}
                    onClick={() => {
                      setTwitchConnectError("");

                      try {
                        const state = createOauthState();
                        sessionStorage.setItem("twitchOauthState", state);

                        const params = new URLSearchParams({
                          client_id: settings.twitchClientId,
                          redirect_uri: twitchRedirectUri,
                          response_type: "token",
                          scope: "user:read:chat",
                          state,
                        });

                        window.location.assign(
                          `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
                        );
                      } catch (error) {
                        console.error("Failed to start Twitch OAuth:", error);
                        setTwitchConnectError(
                          "Twitch 接続を開始できませんでした。Client ID とブラウザ設定を確認してください。"
                        );
                      }
                    }}
                  >
                    Twitch に接続
                  </button>
                )}

                {!settings.twitchAccessToken && (
                  <>
                    <p className={styles.hint}>
                      Twitch Developers の OAuth Redirect URL には次を登録してください:
                    </p>
                    <p className={styles.hint}>{twitchRedirectUri}</p>
                    {twitchConnectError && (
                      <p className={styles.errorText}>{twitchConnectError}</p>
                    )}
                  </>
                )}

                <label className={styles.label}>
                  チャンネル名
                  <input
                    className={styles.textInput}
                    type="text"
                    value={settings.twitchChannel}
                    onChange={(e) =>
                      onUpdate({ twitchChannel: e.target.value })
                    }
                    placeholder="channel_name"
                  />
                </label>

                <label className={styles.label}>
                  コメント取得間隔
                  <select
                    className={styles.textInput}
                    value={settings.twitchCommentInterval}
                    onChange={(e) =>
                      onUpdate({
                        twitchCommentInterval: parseInt(e.target.value),
                      })
                    }
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.twitchEnabled}
                    onChange={(e) =>
                      onUpdate({ twitchEnabled: e.target.checked })
                    }
                  />
                  Twitch コメント取得を有効にする
                </label>
              </>
            )}
          </div>
        </details>

        <button className={styles.closeBtn} type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
