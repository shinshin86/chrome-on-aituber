import type { ChatMessage as ChatMessageType } from "../../types";
import styles from "./Chat.module.css";

interface Props {
  message: ChatMessageType;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ChatMessageBubble({ message }: Props) {
  return (
    <div className={`${styles.message} ${styles[message.role]}`}>
      <span className={styles.role}>
        {message.role === "user" ? "You" : "AI"}
      </span>
      <span className={styles.content}>{message.content}</span>
      <span className={styles.time}>{formatTime(message.timestamp)}</span>
    </div>
  );
}
