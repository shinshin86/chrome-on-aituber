import { useState, useMemo, useCallback, useEffect } from "react";
import { Avatar } from "./components/Avatar/Avatar";
import { ChatLog } from "./components/Chat/ChatLog";
import { BottomBar } from "./components/Chat/BottomBar";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { ManualDialog } from "./components/Manual/ManualDialog";
import { useChat } from "./hooks/useChat";
import { useSettings } from "./hooks/useSettings";
import { useYoutubeComments } from "./hooks/useYoutubeComments";
import {
  getDefaultAvatar,
  getAllAvatars,
  revokeAvatarUrls,
} from "./services/avatar/avatarService";
import type { AvatarPack } from "./types";
import type { YouTubeChatMessage } from "./services/youtube/youtubeService";
import "./App.css";

function App() {
  const { settings, updateSettings } = useSettings();
  const { messages, isSending, llmStatus, statusText, mouthOpen, send, reset } =
    useChat(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [broadcastHint, setBroadcastHint] = useState(false);

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

  // 配信モードに切り替わったらヒントを一定時間表示
  useEffect(() => {
    if (isBroadcast) {
      setBroadcastHint(true);
      const timer = setTimeout(() => setBroadcastHint(false), 4000);
      return () => clearTimeout(timer);
    }
    setBroadcastHint(false);
  }, [isBroadcast]);

  // YouTube Live コメントを受け取って LLM に送信
  const handleYoutubeComment = useCallback(
    (comment: YouTubeChatMessage) => {
      send(`${comment.userName} さんのコメント: ${comment.userComment}`);
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
          onReset={reset}
          disabled={!llmReady || isSending}
          isSending={isSending}
          ttsEnabled={settings.ttsEnabled}
          statusText={statusText}
          onToggleTts={() => updateSettings({ ttsEnabled: !settings.ttsEnabled })}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenManual={() => setManualOpen(true)}
        />
      )}

      <SettingsPanel
        settings={settings}
        onUpdate={updateSettings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ManualDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
      />
    </div>
  );
}

export default App;
