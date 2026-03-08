import { useState, useRef, type KeyboardEvent } from "react";
import styles from "./BottomBar.module.css";

interface Props {
  onSend: (text: string) => void;
  onReset: () => void;
  disabled: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onOpenSettings: () => void;
}

export function BottomBar({
  onSend,
  onReset,
  disabled,
  ttsEnabled,
  onToggleTts,
  onOpenSettings,
}: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.bar}>
      <button
        className={`${styles.iconBtn} ${styles.ttsBtn}`}
        onClick={onToggleTts}
        aria-label="音声切替"
        title={ttsEnabled ? "TTS ON" : "TTS OFF"}
      >
        {ttsEnabled ? "\u{1F50A}" : "\u{1F507}"}
      </button>

      <button
        className={`${styles.iconBtn} ${styles.resetBtnIcon}`}
        onClick={onReset}
        aria-label="リセット"
        title="会話リセット"
      >
        &#x21BB;
      </button>

      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="聞きたいことをいれてね"
        disabled={disabled}
      />

      <button
        className={styles.sendBtn}
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        aria-label="送信"
      >
        &#x27A4;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.settingsBtn}`}
        onClick={onOpenSettings}
        aria-label="設定"
      >
        &#x2699;
      </button>
    </div>
  );
}
