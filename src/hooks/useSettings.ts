import { useState, useCallback } from "react";
import type { AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import {
  loadSettings,
  saveSettings,
} from "../services/storage/storageService";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveSettings(next);
    },
    [settings]
  );

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
