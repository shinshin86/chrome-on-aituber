import { useState, useRef, type KeyboardEvent } from "react";
import styles from "./Chat.module.css";

const MAX_LENGTH = 4000;

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const overLimit = text.length > MAX_LENGTH;

  return (
    <footer className={styles.inputArea}>
      {text.length > 0 && (
        <div className={`${styles.charCount} ${overLimit ? styles.over : ""}`}>
          {text.length} / {MAX_LENGTH}
        </div>
      )}
      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力（Enter で送信、Shift+Enter で改行）"
          rows={2}
          maxLength={MAX_LENGTH}
          disabled={disabled}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={disabled || !text.trim() || overLimit}
        >
          送信
        </button>
      </div>
    </footer>
  );
}
