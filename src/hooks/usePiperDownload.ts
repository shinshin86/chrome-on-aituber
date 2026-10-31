import { useSyncExternalStore } from "react";
import { useI18n, type I18nContextValue } from "../i18n/useI18n";
import type { PiperVoice } from "../types";
import { getPiperDownloadState, PiperPreparationError, subscribePiperDownload } from "../services/tts/piperAssets";

export function localizePiperError(error: unknown, t: I18nContextValue["t"]): string | null {
  return error instanceof PiperPreparationError ? t(`piper.${error.code}`) : null;
}

export function usePiperDownload(voice: PiperVoice) {
  const { t } = useI18n();
  const state = useSyncExternalStore(subscribePiperDownload, getPiperDownloadState);
  const active = state.voice === voice;
  const downloading = active && state.downloading;
  const percent = state.totalBytes === null ? null : Math.min(100,
    Math.round(state.loadedBytes / Math.max(1, state.totalBytes) * 100));
  const bytes = `${(state.loadedBytes / 1024 ** 2).toFixed(1)} MB`;
  const text = downloading ? (percent === null
    ? t("piper.downloadingUnknown", { bytes })
    : t("piper.downloading", { percent, bytes,
      total: `${((state.totalBytes ?? 0) / 1024 ** 2).toFixed(1)} MB` })) : "";
  return { downloading, percent, text,
    error: active ? localizePiperError(state.error, t) : null };
}
