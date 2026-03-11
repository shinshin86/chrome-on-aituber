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
import type { AvatarPack } from "./types";
import type { YouTubeChatMessage } from "./services/youtube/youtubeService";
import type { TwitchChatMessage } from "./services/twitch/twitchService";
import "./App.css";

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
  const broadcastHintTimerRef = useRef<number | null>(null);

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
        name: comment.userName,
        iconUrl: comment.userIconUrl,
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
        name: comment.userName,
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

  return (
    <div className={`app ${isBroadcast ? "broadcast" : ""}`}>
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
            <ChatLog messages={aiMessages} label="AI" />
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
            <ChatLog messages={userMessages} label="You" />
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
        onUpdate={handleUpdateSettings}
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
    </div>
  );
}

export default App;
