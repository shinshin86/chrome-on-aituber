import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_SYSTEM_PROMPT_EN,
  DEFAULT_SYSTEM_PROMPT_JA,
  LANGUAGE_LABELS,
  isDefaultSystemPrompt,
} from "../../types";
import type {
  AppSettings,
  AppMode,
  ChatMessage,
  ChatSource,
  Language,
  StreamingPlatform,
  TtsEngine,
} from "../../types";
import { useI18n } from "../../i18n/I18nContext";
import * as tts from "../../services/tts/ttsService";
import { AvatarSettings } from "./AvatarSettings";
import { IrodoriTtsSettings } from "./IrodoriTtsSettings";
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

function formatSourceLabel(
  message: ChatMessage,
  sourceLabels: Record<ChatSource, string>,
  unknownLabel: string
): string {
  return message.source ? sourceLabels[message.source] : unknownLabel;
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

function toTtsLengthScale(speedMultiplier: number): number {
  return speedMultiplier > 0 ? 1 / speedMultiplier : 1;
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
  const { t } = useI18n();
  const [twitchConnectError, setTwitchConnectError] = useState("");
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [backgroundError, setBackgroundError] = useState("");
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleStatus, setSampleStatus] = useState("");
  const [sampleError, setSampleError] = useState("");
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const twitchRedirectUri =
    typeof window === "undefined"
      ? ""
      : new URL(window.location.pathname, window.location.origin).toString();
  const modeOptions = useMemo<{ value: AppMode; label: string }[]>(
    () => [
      { value: "chat", label: t("settings.displayMode.chat") },
      { value: "broadcast", label: t("settings.displayMode.broadcast") },
    ],
    [t]
  );
  const ttsEngineOptions = useMemo<{ value: TtsEngine; label: string }[]>(
    () => [
      { value: "piper", label: t("common.ttsEngine.piper") },
      { value: "irodori", label: t("common.ttsEngine.irodori") },
    ],
    [t]
  );
  const intervalOptions = useMemo(
    () => [
      { value: 10000, label: t("settings.interval.seconds", { seconds: 10 }) },
      { value: 15000, label: t("settings.interval.seconds", { seconds: 15 }) },
      {
        value: 20000,
        label: t("settings.interval.recommendedSeconds", { seconds: 20 }),
      },
      { value: 30000, label: t("settings.interval.seconds", { seconds: 30 }) },
      { value: 60000, label: t("settings.interval.seconds", { seconds: 60 }) },
    ],
    [t]
  );
  const sourceLabels = useMemo<Record<ChatSource, string>>(
    () => ({
      chat: t("common.source.chat"),
      youtube: t("common.source.youtube"),
      twitch: t("common.source.twitch"),
    }),
    [t]
  );

  async function handleBackgroundChange(file: File | null) {
    if (!file || backgroundBusy) return;

    setBackgroundBusy(true);
    setBackgroundError("");

    try {
      await onUploadBackgroundImage(file);
    } catch (e) {
      setBackgroundError(
        e instanceof Error ? e.message : t("settings.background.saveFailed")
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
        e instanceof Error ? e.message : t("settings.background.resetFailed")
      );
    } finally {
      setBackgroundBusy(false);
    }
  }

  function handleDeleteMessages() {
    if (messages.length === 0) return;

    const confirmed = window.confirm(t("settings.chatLog.confirmDelete"));

    if (!confirmed) return;

    onReset();
  }

  async function handlePlayTtsSample() {
    if (sampleBusy) return;

    setSampleBusy(true);
    setSampleError("");
    setSampleStatus(t("settings.aiVoice.samplePreparing"));

    try {
      await tts.setEngine(settings.ttsEngine);

      if (!tts.isReady()) {
        await tts.initialize((msg) => {
          setSampleStatus(msg ?? "");
        });
      }

      setSampleStatus(t("settings.aiVoice.sampleGeneratingStatus"));
      await tts.speak(
        t("settings.aiVoice.sampleText"),
        () => undefined,
        settings.ttsEngine === "piper"
          ? toTtsLengthScale(settings.ttsLengthScale)
          : undefined
      );
      setSampleStatus(t("settings.aiVoice.samplePlayed"));
    } catch (e) {
      setSampleStatus("");
      setSampleError(
        e instanceof Error
          ? e.message
          : t("settings.aiVoice.sampleFailed")
      );
    } finally {
      setSampleBusy(false);
    }
  }

  function handleStopTtsSample() {
    tts.stop({ cancelIrodori: true });
    setSampleBusy(false);
    setSampleStatus("");
  }

  function handleLanguageChange(language: Language) {
    if (isDefaultSystemPrompt(settings.llmSystemPrompt)) {
      onUpdate({
        language,
        llmSystemPrompt:
          language === "en"
            ? DEFAULT_SYSTEM_PROMPT_EN
            : DEFAULT_SYSTEM_PROMPT_JA,
      });
      return;
    }

    onUpdate({ language });
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{t("settings.title")}</h2>

        <details className={styles.section} open>
          <summary>{t("settings.language.summary")}</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              {t("settings.language.label")}
              <select
                className={styles.textInput}
                value={settings.language}
                onChange={(e) =>
                  handleLanguageChange(e.target.value as Language)
                }
              >
                {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>

        {/* 表示モード */}
        <details className={styles.section}>
          <summary>{t("settings.displayMode.summary")}</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              <select
                className={styles.textInput}
                value={settings.appMode}
                onChange={(e) =>
                  onUpdate({ appMode: e.target.value as AppMode })
                }
              >
                {modeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {settings.appMode === "broadcast" && (
                <span className={styles.hint}>
                  {t("settings.displayMode.broadcastHint")} <kbd>Ctrl</kbd>+
                  <kbd>S</kbd> {t("settings.displayMode.broadcastHintSuffix")}
                </span>
              )}
            </label>
          </div>
        </details>

        <details className={styles.section}>
          <summary>{t("settings.background.summary")}</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              {t("settings.background.label")}
              <span className={styles.hint}>
                {t("settings.background.hint")}
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
                  ? t("settings.background.saving")
                  : settings.backgroundImageEnabled
                    ? t("settings.background.change")
                    : t("settings.background.select")}
              </button>

              <button
                className={styles.secondaryBtn}
                type="button"
                disabled={!settings.backgroundImageEnabled || backgroundBusy}
                onClick={() => void handleResetBackground()}
              >
                {t("settings.background.reset")}
              </button>
            </div>

            <span className={styles.hint}>
              {settings.backgroundImageEnabled
                ? t("settings.background.customActive")
                : t("settings.background.defaultActive")}
            </span>

            {backgroundError && (
              <div className={styles.errorText}>{backgroundError}</div>
            )}
          </div>
        </details>

        {/* アバター設定 */}
        <details className={styles.section}>
          <summary>{t("settings.avatar.summary")}</summary>
          <div className={styles.sectionContent}>
            <AvatarSettings
              selectedAvatarId={settings.selectedAvatarId}
              onSelectAvatar={(id) => onUpdate({ selectedAvatarId: id })}
            />
          </div>
        </details>

        {/* AI / 音声 */}
        <details className={styles.section}>
          <summary>{t("settings.aiVoice.summary")}</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              {t("settings.aiVoice.systemPrompt")}
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
              {t("settings.aiVoice.ttsEnabled")}
            </label>

            <label className={styles.label}>
              {t("settings.aiVoice.ttsEngine")}
              <select
                className={styles.textInput}
                value={settings.ttsEngine}
                onChange={(e) =>
                  onUpdate({ ttsEngine: e.target.value as TtsEngine })
                }
              >
                {ttsEngineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {settings.ttsEngine === "irodori" && <IrodoriTtsSettings />}

            {settings.ttsEngine === "piper" && (
              <>
                <label className={styles.label}>
                  {t("settings.aiVoice.speed", {
                    value: settings.ttsLengthScale.toFixed(1),
                  })}
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
                <p className={styles.hint}>
                  {t("settings.aiVoice.piperCreditLine1")}
                  <br />
                  {t("settings.aiVoice.piperCreditLine2")}
                </p>
              </>
            )}

            <div className={styles.ttsSampleBox}>
              <div className={styles.actionRow}>
                <button
                  className={styles.subActionBtn}
                  type="button"
                  disabled={sampleBusy}
                  onClick={() => void handlePlayTtsSample()}
                >
                  {sampleBusy
                    ? t("settings.aiVoice.sampleGenerating")
                    : t("settings.aiVoice.samplePlay")}
                </button>
                <button
                  className={styles.secondaryBtn}
                  type="button"
                  onClick={handleStopTtsSample}
                >
                  {t("settings.aiVoice.sampleStop")}
                </button>
              </div>
              <p className={styles.hint}>
                {t("settings.aiVoice.sampleHint", {
                  engine: t(`common.ttsEngine.${settings.ttsEngine}`),
                })}
              </p>
              {sampleStatus && <p className={styles.hint}>{sampleStatus}</p>}
              {sampleError && <p className={styles.errorText}>{sampleError}</p>}
            </div>

          </div>
        </details>

        <details className={styles.section}>
          <summary>{t("settings.chatLog.summary")}</summary>
          <div className={styles.sectionContent}>
            <p className={styles.hint}>
              {t("settings.chatLog.count", { count: messages.length })}
            </p>

            <div className={styles.chatLogViewer}>
              {messages.length === 0 ? (
                <p className={styles.chatLogEmpty}>
                  {t("settings.chatLog.empty")}
                </p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={styles.chatLogItem}>
                    <div className={styles.chatLogMeta}>
                      <span className={styles.chatLogRole}>
                        {message.role === "assistant" ? assistantLabel : "USER"}
                      </span>
                      <span className={styles.chatLogSource}>
                        {formatSourceLabel(
                          message,
                          sourceLabels,
                          t("common.source.unknown")
                        )}
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
                {t("settings.chatLog.exportCsv")}
              </button>
              <button
                className={styles.resetBtn}
                type="button"
                disabled={messages.length === 0}
                onClick={handleDeleteMessages}
              >
                {t("settings.chatLog.delete")}
              </button>
            </div>
          </div>
        </details>

        {/* 配信チャット連携 */}
        <details className={styles.section}>
          <summary>{t("settings.streaming.summary")}</summary>
          <div className={styles.sectionContent}>
            <label className={styles.label}>
              {t("settings.streaming.platform")}
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
                  {t("settings.streaming.youtubeLiveId")}
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
                  {t("settings.streaming.interval")}
                  <select
                    className={styles.textInput}
                    value={settings.youtubeCommentInterval}
                    onChange={(e) =>
                      onUpdate({
                        youtubeCommentInterval: parseInt(e.target.value),
                      })
                    }
                  >
                    {intervalOptions.map((opt) => (
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
                  {t("settings.streaming.youtubeEnabled")}
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
                      {t("settings.streaming.twitchConnected")}
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
                      {t("settings.streaming.disconnect")}
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
                          t("settings.streaming.twitchConnectFailed")
                        );
                      }
                    }}
                  >
                    {t("settings.streaming.connectTwitch")}
                  </button>
                )}

                {!settings.twitchAccessToken && (
                  <>
                    <p className={styles.hint}>
                      {t("settings.streaming.twitchRedirectHint")}
                    </p>
                    <p className={styles.hint}>{twitchRedirectUri}</p>
                    {twitchConnectError && (
                      <p className={styles.errorText}>{twitchConnectError}</p>
                    )}
                  </>
                )}

                <label className={styles.label}>
                  {t("settings.streaming.twitchChannel")}
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
                  {t("settings.streaming.interval")}
                  <select
                    className={styles.textInput}
                    value={settings.twitchCommentInterval}
                    onChange={(e) =>
                      onUpdate({
                        twitchCommentInterval: parseInt(e.target.value),
                      })
                    }
                  >
                    {intervalOptions.map((opt) => (
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
                  {t("settings.streaming.twitchEnabled")}
                </label>
              </>
            )}
          </div>
        </details>

        <button className={styles.closeBtn} type="button" onClick={onClose}>
          {t("settings.close")}
        </button>
      </div>
    </div>
  );
}
