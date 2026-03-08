import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../types";
import styles from "./ChatLog.module.css";

interface Props {
  messages: ChatMessage[];
  label: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ChatLog({ messages, label }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.log}>
      <div className={styles.header}>{label}</div>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.bubble} ${label === "AI" ? styles.bubbleAi : styles.bubbleUser}`}>
            <span className={styles.text}>{msg.content}</span>
            <span className={styles.time}>{formatTime(msg.timestamp)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
