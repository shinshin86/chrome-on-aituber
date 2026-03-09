import type { AppSettings, AppMode } from "../../types";
import styles from "./Settings.module.css";

interface Props {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: { value: AppMode; label: string }[] = [
  { value: "chat", label: "チャットモード" },
  { value: "broadcast", label: "配信モード（グリーンバック）" },
];

const INTERVAL_OPTIONS = [
  { value: 10000, label: "10秒" },
  { value: 15000, label: "15秒" },
  { value: 20000, label: "20秒（推奨）" },
  { value: 30000, label: "30秒" },
  { value: 60000, label: "60秒" },
];

export function SettingsPanel({ settings, onUpdate, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>設定</h2>

        {/* App Mode */}
        <label className={styles.label}>
          表示モード
          <select
            className={styles.textInput}
            value={settings.appMode}
            onChange={(e) =>
              onUpdate({ appMode: e.target.value as AppMode })
            }
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {settings.appMode === "broadcast" && (
            <span className={styles.hint}>
              配信モード中は <kbd>Ctrl</kbd>+<kbd>S</kbd> でこの設定を開けます
            </span>
          )}
        </label>

        {/* LLM */}
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

        {/* YouTube Live */}
        <h3 className={styles.sectionTitle}>YouTube Live 連携</h3>

        <label className={styles.label}>
          YouTube API Key
          <input
            className={styles.textInput}
            type="password"
            value={settings.youtubeApiKey}
            onChange={(e) => onUpdate({ youtubeApiKey: e.target.value })}
            placeholder="xxx..."
          />
        </label>

        <label className={styles.label}>
          ライブ配信 ID
          <input
            className={styles.textInput}
            type="text"
            value={settings.youtubeLiveId}
            onChange={(e) => onUpdate({ youtubeLiveId: e.target.value })}
            placeholder="xxx..."
          />
        </label>

        <label className={styles.label}>
          コメント取得間隔
          <select
            className={styles.textInput}
            value={settings.youtubeCommentInterval}
            onChange={(e) =>
              onUpdate({ youtubeCommentInterval: parseInt(e.target.value) })
            }
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={settings.youtubeEnabled}
            onChange={(e) => onUpdate({ youtubeEnabled: e.target.checked })}
          />
          YouTube Live コメント取得を有効にする
        </label>

        <button className={styles.closeBtn} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
