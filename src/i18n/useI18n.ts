import { createContext, useContext } from "react";
import type { Language } from "../types";
import { ja } from "./messages/ja";

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

export interface I18nContextValue {
  language: Language;
  t: (key: I18nKey, params?: I18nParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
