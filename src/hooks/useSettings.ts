import { useState, useCallback, useEffect } from "react";
import type { AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import {
  loadSettings,
  saveSettings,
} from "../services/storage/storageService";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
