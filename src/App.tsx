import { useState, useMemo } from "react";
import { Avatar } from "./components/Avatar/Avatar";
import { ChatLog } from "./components/Chat/ChatLog";
import { BottomBar } from "./components/Chat/BottomBar";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { useChat } from "./hooks/useChat";
import { useSettings } from "./hooks/useSettings";
import { getDefaultAvatar } from "./services/avatar/avatarService";
import "./App.css";

function App() {
  const { settings, updateSettings } = useSettings();
  const { messages, isSending, llmStatus, statusText, mouthOpen, send, reset } =
    useChat(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const avatar = getDefaultAvatar();
  const llmReady = llmStatus === "available";

  const aiMessages = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages]
  );
  const userMessages = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages]
  );

  return (
    <div className="app">
      {/* Status bar */}
      <div className="status-bar">
        <span className={`status ${llmReady ? "ok" : "warn"}`}>
          {statusText}
        </span>
      </div>

      {/* Main stage */}
      <div className="stage">
        <div className="log-column left">
          <ChatLog messages={aiMessages} label="AI" />
        </div>

        <div className="avatar-center">
          <Avatar
            images={avatar.images}
            mouthOpen={mouthOpen}
          />
        </div>

        <div className="log-column right">
          <ChatLog messages={userMessages} label="You" />
        </div>
      </div>

      {/* Bottom input bar */}
      <BottomBar
        onSend={send}
        onReset={reset}
        disabled={!llmReady || isSending}
        ttsEnabled={settings.ttsEnabled}
        onToggleTts={() => updateSettings({ ttsEnabled: !settings.ttsEnabled })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsPanel
        settings={settings}
        onUpdate={updateSettings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
