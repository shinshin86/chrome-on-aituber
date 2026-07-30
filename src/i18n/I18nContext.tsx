import { useMemo, type ReactNode } from "react";
import type { Language } from "../types";
import { ja } from "./messages/ja";
import { en } from "./messages/en";
import {
  I18nContext,
  type I18nContextValue,
  type I18nKey,
  type I18nParams,
} from "./useI18n";

const messages = {
  ja,
  en,
} as const;

function resolveMessage(language: Language, key: I18nKey): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages[language]
    );

  return typeof value === "string" ? value : key;
}

function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

interface I18nProviderProps {
  language: Language;
  children: ReactNode;
}

export function I18nProvider({ language, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (key, params) => interpolate(resolveMessage(language, key), params),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
