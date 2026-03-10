import { useState, useRef, useCallback } from "react";
import { useChatSubmit } from "use-chat-submit";
import styles from "./BottomBar.module.css";

interface Props {
  onSend: (text: string) => void;
  onReset: () => void;
  disabled: boolean;
  isSending: boolean;
  ttsEnabled: boolean;
  statusText: string;
  onToggleTts: () => void;
  onOpenSettings: () => void;
  onOpenManual: () => void;
  onOpenLicense: () => void;
}

export function BottomBar({
  onSend,
  onReset,
  disabled,
  isSending,
  ttsEnabled,
  statusText,
  onToggleTts,
  onOpenSettings,
  onOpenManual,
  onOpenLicense,
}: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const { getTextareaProps } = useChatSubmit({
    onSubmit: handleSubmit,
    mode: "enter",
  });

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

      <textarea
        className={styles.input}
        rows={1}
        placeholder={
          isSending
            ? "応答を生成中..."
            : statusText
              ? statusText
              : "聞きたいことをいれてね"
        }
        disabled={disabled}
        {...getTextareaProps({
          ref: inputRef,
          value: text,
          onChange: (e) => setText(e.target.value),
        })}
      />

      <button
        className={styles.sendBtn}
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        aria-label="送信"
      >
        &#x27A4;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.manualBtn}`}
        onClick={onOpenManual}
        aria-label="マニュアル"
        title="使い方"
      >
        &#x2753;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.licenseBtn}`}
        onClick={onOpenLicense}
        aria-label="ライセンス"
        title="ライセンス"
      >
        &#xa9;
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
