import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Avatar } from "./components/Avatar/Avatar";
import { ChatLog } from "./components/Chat/ChatLog";
import { BottomBar } from "./components/Chat/BottomBar";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { ManualDialog } from "./components/Manual/ManualDialog";
import { LicenseDialog } from "./components/License/LicenseDialog";
import { Toast } from "./components/Toast/Toast";
import { useChat } from "./hooks/useChat";
import { useSettings } from "./hooks/useSettings";
import { useYoutubeComments } from "./hooks/useYoutubeComments";
import { useTwitchComments } from "./hooks/useTwitchComments";
import {
  getDefaultAvatar,
  getAllAvatars,
  revokeAvatarUrls,
} from "./services/avatar/avatarService";
import {
  deleteBackgroundImage,
  loadBackgroundImage,
  saveBackgroundImage,
} from "./services/storage/storageService";
import {
  CHAT_SOURCE_LABELS,
  type AvatarPack,
  type ChatMessage,
} from "./types";
import type { YouTubeChatMessage } from "./services/youtube/youtubeService";
import type { TwitchChatMessage } from "./services/twitch/twitchService";
import "./App.css";

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatCsvDate(timestamp: number): string {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function formatMessageLabel(message: ChatMessage, assistantLabel: string): string {
  return message.role === "assistant" ? assistantLabel : "USER";
}

function formatMessageSource(message: ChatMessage): string {
  return message.source ? CHAT_SOURCE_LABELS[message.source] : "不明";
}

function createChatLogCsv(messages: ChatMessage[], assistantLabel: string): string {
  const header = ["timestamp", "role", "source", "senderName", "content"];
  const rows = messages.map((message) => [
    escapeCsvField(formatCsvDate(message.timestamp)),
    escapeCsvField(formatMessageLabel(message, assistantLabel)),
    escapeCsvField(formatMessageSource(message)),
    escapeCsvField(message.senderName ?? ""),
    escapeCsvField(message.content),
  ]);

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function createExportFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `chat-log-${yyyy}${mm}${dd}-${hh}${mi}${ss}.csv`;
}

function App() {
  const { settings, updateSettings } = useSettings();
  const {
    messages,
    isSending,
    llmStatus,
    statusText,
    mouthOpen,
    errorMessage,
    canInitializeAI,
    isInitializingAI,
    initializeAI,
    send,
    reset,
    clearError,
  } =
    useChat(settings);
  const [streamErrorMessage, setStreamErrorMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [broadcastHint, setBroadcastHint] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundErrorMessage, setBackgroundErrorMessage] = useState("");
  const broadcastHintTimerRef = useRef<number | null>(null);
  const backgroundUrlRef = useRef<string | null>(null);

  const isBroadcast = settings.appMode === "broadcast";
  const [avatar, setAvatar] = useState<AvatarPack>(getDefaultAvatar());
  const llmReady = llmStatus === "available";

  // selectedAvatarId に応じてアバターを読み込む
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (settings.selectedAvatarId === "default") {
        setAvatar(getDefaultAvatar());
        return;
      }
      revokeAvatarUrls();
      const all = await getAllAvatars();
      const found = all.find((a) => a.id === settings.selectedAvatarId);
      if (!cancelled) {
        setAvatar(found ?? getDefaultAvatar());
      }
    }
    load();
    return () => { cancelled = true; };
  }, [settings.selectedAvatarId]);

  // Ctrl+S / Cmd+S で設定パネルを開く
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (broadcastHintTimerRef.current !== null) {
        clearTimeout(broadcastHintTimerRef.current);
      }
    };
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Parameters<typeof updateSettings>[0]) => {
      if (patch.appMode) {
        if (broadcastHintTimerRef.current !== null) {
          clearTimeout(broadcastHintTimerRef.current);
          broadcastHintTimerRef.current = null;
        }

        if (patch.appMode === "broadcast" && settings.appMode !== "broadcast") {
          setBroadcastHint(true);
          broadcastHintTimerRef.current = window.setTimeout(() => {
            setBroadcastHint(false);
            broadcastHintTimerRef.current = null;
          }, 4000);
        } else if (patch.appMode !== "broadcast") {
          setBroadcastHint(false);
        }
      }

      updateSettings(patch);
    },
    [settings.appMode, updateSettings]
  );

  // Twitch OAuth トークン取得（マウント時1回）
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("access_token");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("twitchOauthState");

    let timer: number | null = null;

    if (token && state && state === savedState) {
      timer = window.setTimeout(() => {
        handleUpdateSettings({
          twitchAccessToken: token,
          twitchEnabled: true,
        });
      }, 0);
      sessionStorage.removeItem("twitchOauthState");
    }

    // URL ハッシュをクリア
    history.replaceState(null, "", window.location.pathname + window.location.search);

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [handleUpdateSettings]);

  // YouTube Live コメントを受け取って LLM に送信
  const handleYoutubeComment = useCallback(
    (comment: YouTubeChatMessage) => {
      send(`${comment.userName} さんのコメント: ${comment.userComment}`, {
        sender: {
          name: comment.userName,
          iconUrl: comment.userIconUrl,
        },
        source: "youtube",
      });
    },
    [send]
  );

  useYoutubeComments({
    youtubeLiveId: settings.youtubeLiveId,
    youtubeApiKey: settings.youtubeApiKey,
    isEnabled: settings.youtubeEnabled,
    intervalMs: settings.youtubeCommentInterval,
    onComment: handleYoutubeComment,
  });

  // Twitch コメントを受け取って LLM に送信
  const handleTwitchComment = useCallback(
    (comment: TwitchChatMessage) => {
      send(`${comment.userName} さんのコメント: ${comment.userComment}`, {
        sender: {
          name: comment.userName,
        },
        source: "twitch",
      });
    },
    [send]
  );

  useTwitchComments({
    twitchChannel: settings.twitchChannel,
    twitchClientId: settings.twitchClientId,
    twitchAccessToken: settings.twitchAccessToken,
    isEnabled: settings.twitchEnabled,
    intervalMs: settings.twitchCommentInterval,
    onComment: handleTwitchComment,
    onTokenExpired: () => handleUpdateSettings({ twitchAccessToken: "" }),
    onError: setStreamErrorMessage,
  });

  const aiMessages = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages]
  );
  const userMessages = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBackground() {
      if (!settings.backgroundImageEnabled) {
        if (backgroundUrlRef.current) {
          URL.revokeObjectURL(backgroundUrlRef.current);
          backgroundUrlRef.current = null;
        }
        setBackgroundErrorMessage("");
        setBackgroundImageUrl(null);
        return;
      }

      try {
        const stored = await loadBackgroundImage();
        if (!stored) {
          if (!cancelled) {
            setBackgroundImageUrl(null);
            handleUpdateSettings({
              backgroundImageEnabled: false,
              backgroundImageUpdatedAt: 0,
            });
          }
          return;
        }

        const url = URL.createObjectURL(stored.image);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        if (backgroundUrlRef.current) {
          URL.revokeObjectURL(backgroundUrlRef.current);
        }
        backgroundUrlRef.current = url;
        setBackgroundErrorMessage("");
        setBackgroundImageUrl(url);
      } catch (e) {
        console.warn("Background image load error:", e);
        if (!cancelled) {
          setBackgroundErrorMessage("背景画像の読み込みに失敗しました");
        }
      }
    }

    void loadBackground();

    return () => {
      cancelled = true;
    };
  }, [
    handleUpdateSettings,
    settings.backgroundImageEnabled,
    settings.backgroundImageUpdatedAt,
  ]);

  useEffect(() => {
    return () => {
      if (backgroundUrlRef.current) {
        URL.revokeObjectURL(backgroundUrlRef.current);
        backgroundUrlRef.current = null;
      }
    };
  }, []);

  const handleUploadBackgroundImage = useCallback(
    async (file: File) => {
      try {
        await saveBackgroundImage(file, file.name);
        handleUpdateSettings({
          backgroundImageEnabled: true,
          backgroundImageUpdatedAt: Date.now(),
        });
      } catch {
        throw new Error("背景画像の保存に失敗しました");
      }
    },
    [handleUpdateSettings]
  );

  const handleResetBackgroundImage = useCallback(async () => {
    try {
      await deleteBackgroundImage();
      handleUpdateSettings({
        backgroundImageEnabled: false,
        backgroundImageUpdatedAt: 0,
      });
    } catch {
      throw new Error("背景画像のリセットに失敗しました");
    }
  }, [handleUpdateSettings]);

  const handleExportMessages = useCallback(() => {
    if (messages.length === 0) return;

    const csv = createChatLogCsv(messages, avatar.name);
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = createExportFileName();
    anchor.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [avatar.name, messages]);

  const appStyle = useMemo(
    () =>
      backgroundImageUrl
        ? {
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }
        : undefined,
    [backgroundImageUrl]
  );

  return (
    <div
      className={`app ${isBroadcast ? "broadcast" : ""}`}
      style={appStyle}
    >
      {/* 配信モードヒント */}
      {broadcastHint && (
        <div className="broadcast-hint">
          <p>配信モードです</p>
          <p>
            <kbd>Ctrl</kbd>+<kbd>S</kbd> で設定を開き、チャットモードに戻せます
          </p>
        </div>
      )}

      {/* Main stage */}
      <div className="stage">
        {!isBroadcast && (
          <div className="log-column left">
            <ChatLog messages={aiMessages} label={avatar.name} variant="assistant" />
          </div>
        )}

        <div className="avatar-center">
          <Avatar
            images={avatar.images}
            mouthOpen={mouthOpen}
          />
        </div>

        {!isBroadcast && (
          <div className="log-column right">
            <ChatLog messages={userMessages} label="You" variant="user" />
          </div>
        )}
      </div>

      {/* チャットモードのみ: Bottom input bar */}
      {!isBroadcast && (
        <BottomBar
          onSend={send}
          disabled={!llmReady || isSending}
          isSending={isSending}
          statusText={statusText}
          showInitializeAI={canInitializeAI}
          isInitializingAI={isInitializingAI}
          onInitializeAI={initializeAI}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenManual={() => setManualOpen(true)}
          onOpenLicense={() => setLicenseOpen(true)}
        />
      )}

      {isBroadcast && canInitializeAI && (
        <div className="ai-prepare-overlay">
          <div className="ai-prepare-card">
            <p className="ai-prepare-title">AI の準備が必要です</p>
            <p className="ai-prepare-text">
              Gemini Nano の初回モデル準備は、ユーザー操作から開始してください。
            </p>
            <button
              className="ai-prepare-button"
              type="button"
              onClick={initializeAI}
              disabled={isInitializingAI}
            >
              {isInitializingAI ? "AI を準備中..." : "AI を準備"}
            </button>
            {statusText && (
              <p className="ai-prepare-status">{statusText}</p>
            )}
          </div>
        </div>
      )}

      <SettingsPanel
        settings={settings}
        messages={messages}
        assistantLabel={avatar.name}
        onUpdate={handleUpdateSettings}
        onUploadBackgroundImage={handleUploadBackgroundImage}
        onResetBackgroundImage={handleResetBackgroundImage}
        onExportMessages={handleExportMessages}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReset={reset}
      />

      <ManualDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
      />

      <LicenseDialog
        open={licenseOpen}
        onClose={() => setLicenseOpen(false)}
      />

      {errorMessage && (
        <Toast message={errorMessage} onClose={clearError} />
      )}

      {streamErrorMessage && (
        <Toast
          message={streamErrorMessage}
          onClose={() => setStreamErrorMessage("")}
        />
      )}

      {backgroundErrorMessage && (
        <Toast
          message={backgroundErrorMessage}
          onClose={() => setBackgroundErrorMessage("")}
        />
      )}
    </div>
  );
}

export default App;
