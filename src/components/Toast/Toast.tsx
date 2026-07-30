import { useEffect } from "react";
import { useI18n } from "../../i18n/useI18n";
import styles from "./Toast.module.css";

interface Props {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 5000 }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.message}>{message}</span>
      <button className={styles.close} onClick={onClose} aria-label={t("toast.close")}>
        &times;
      </button>
    </div>
  );
}
