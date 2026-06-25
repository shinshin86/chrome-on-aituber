import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Language } from "../types";
import { ja } from "./messages/ja";
import { en } from "./messages/en";

const messages = {
  ja,
  en,
} as const;

type MessageTree = typeof ja;
type Primitive = string | number | boolean | null | undefined;
type DotPrefix<TPrefix extends string, TKey extends string> =
  TPrefix extends "" ? TKey : `${TPrefix}.${TKey}`;

type MessageKey<T, TPrefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? DotPrefix<TPrefix, K>
    : T[K] extends Record<string, unknown>
      ? MessageKey<T[K], DotPrefix<TPrefix, K>>
      : never;
}[keyof T & string];

export type I18nKey = MessageKey<MessageTree>;
export type I18nParams = Record<string, Primitive>;

interface I18nContextValue {
  language: Language;
  t: (key: I18nKey, params?: I18nParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

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

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
