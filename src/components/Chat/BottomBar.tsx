import { useState, useRef, useCallback } from "react";
import { useChatSubmit } from "use-chat-submit";
import styles from "./BottomBar.module.css";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  isSending: boolean;
  statusText: string;
  onOpenSettings: () => void;
  onOpenManual: () => void;
  onOpenLicense: () => void;
}

export function BottomBar({
  onSend,
  disabled,
  isSending,
  statusText,
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
        className={`${styles.iconBtn} ${styles.manualBtn}`}
        onClick={onOpenManual}
        aria-label="マニュアル"
        title="使い方マニュアルを開く"
      >
        &#x2753;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.licenseBtn}`}
        onClick={onOpenLicense}
        aria-label="ライセンス"
        title="ライセンス情報を表示"
      >
        &#xa9;
      </button>

      <textarea
        className={styles.input}
        rows={1}
        placeholder={
          isSending
            ? "応答を生成中..."
            : statusText
              ? statusText
              : "メッセージを入力（Enterで送信、Shift+Enterで改行）"
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
        title="メッセージを送信"
      >
        &#x27A4;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.settingsBtn}`}
        onClick={onOpenSettings}
        aria-label="設定"
        title="設定を開く"
      >
        &#x2699;
      </button>
    </div>
  );
}
