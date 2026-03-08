import type { AppSettings } from "../../types";
import styles from "./Settings.module.css";

interface Props {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdate, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>設定</h2>

        <label className={styles.label}>
          システムプロンプト
          <textarea
            className={styles.textarea}
            value={settings.llmSystemPrompt}
            onChange={(e) => onUpdate({ llmSystemPrompt: e.target.value })}
            rows={4}
          />
        </label>

        <label className={styles.label}>
          読み上げ速度 ({settings.ttsLengthScale.toFixed(1)}x)
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.ttsLengthScale}
            onChange={(e) =>
              onUpdate({ ttsLengthScale: parseFloat(e.target.value) })
            }
          />
        </label>

        <button className={styles.closeBtn} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
