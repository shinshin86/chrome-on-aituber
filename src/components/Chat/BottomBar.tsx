import { useState } from "react";
import { useChatSubmit } from "use-chat-submit";
import { useI18n } from "../../i18n/I18nContext";
import styles from "./BottomBar.module.css";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  isSending: boolean;
  statusText: string;
  showInitializeAI: boolean;
  isInitializingAI: boolean;
  onInitializeAI: () => void;
  onOpenSettings: () => void;
  onOpenManual: () => void;
  onOpenLicense: () => void;
}

export function BottomBar({
  onSend,
  disabled,
  isSending,
  statusText,
  showInitializeAI,
  isInitializingAI,
  onInitializeAI,
  onOpenSettings,
  onOpenManual,
  onOpenLicense,
}: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const { getTextareaProps, textareaRef } = useChatSubmit({
    onSubmit: submitCurrentText,
    mode: "enter",
  });

  function submitCurrentText() {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    queueMicrotask(() => textareaRef.current?.focus());
  }

  return (
    <div className={styles.bar}>
      <button
        className={`${styles.iconBtn} ${styles.manualBtn}`}
        onClick={onOpenManual}
        aria-label={t("bottomBar.manualLabel")}
        title={t("bottomBar.manualTitle")}
      >
        &#x2753;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.licenseBtn}`}
        onClick={onOpenLicense}
        aria-label={t("bottomBar.licenseLabel")}
        title={t("bottomBar.licenseTitle")}
      >
        &#xa9;
      </button>

      {showInitializeAI && (
        <button
          className={styles.prepareBtn}
          onClick={onInitializeAI}
          disabled={isInitializingAI}
          type="button"
        >
          {isInitializingAI ? t("bottomBar.prepareBusy") : t("bottomBar.prepareAi")}
        </button>
      )}

      <textarea
        className={styles.input}
        rows={1}
        placeholder={
          isSending
            ? t("bottomBar.generating")
            : statusText
              ? statusText
              : t("bottomBar.inputPlaceholder")
        }
        disabled={disabled}
        {...getTextareaProps({
          value: text,
          onChange: (e) => setText(e.target.value),
        })}
      />

      <button
        className={styles.sendBtn}
        onClick={submitCurrentText}
        disabled={disabled || !text.trim()}
        aria-label={t("bottomBar.sendLabel")}
        title={t("bottomBar.sendTitle")}
      >
        &#x27A4;
      </button>

      <button
        className={`${styles.iconBtn} ${styles.settingsBtn}`}
        onClick={onOpenSettings}
        aria-label={t("bottomBar.settingsLabel")}
        title={t("bottomBar.settingsTitle")}
      >
        &#x2699;
      </button>
    </div>
  );
}
