import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n, type I18nKey, type I18nParams } from "../i18n/I18nContext";
import type { ChatMessage, AppSettings, ChatSource } from "../types";
import * as llm from "../services/llm/llmService";
import * as tts from "../services/tts/ttsService";
import {
  loadMessages,
  saveMessages,
} from "../services/storage/storageService";

export type LLMStatus = "checking" | "available" | "downloading" | "unavailable" | "error";

interface SendOptions {
  sender?: { name: string; iconUrl?: string };
  source?: ChatSource;
}

function getContextHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

type Translate = (key: I18nKey, params?: I18nParams) => string;

function getLLMErrorMessage(
  error: unknown,
  fallback: string,
  userGestureMessage: string,
  t: Translate
): string {
  const detail = error instanceof Error ? error.message : "";

  if (/requires a user gesture/i.test(detail)) {
    return userGestureMessage;
  }

  return detail ? t("chat.status.withDetail", { fallback, detail }) : fallback;
}

function getTtsErrorMessage(error: unknown, fallback: string, t: Translate): string {
  const detail = error instanceof Error ? error.message : "";
  return detail ? t("chat.status.withDetail", { fallback, detail }) : fallback;
}

function toTtsLengthScale(speedMultiplier: number): number {
  // Piper's lengthScale controls utterance duration, so larger values make speech slower.
  // The UI exposes speed, therefore we invert the slider value before passing it to TTS.
  return speedMultiplier > 0 ? 1 / speedMultiplier : 1;
}

export function useChat(settings: AppSettings) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LLMStatus>("checking");
  const [statusText, setStatusText] = useState(() => t("chat.status.checkingAi"));
  const [mouthOpen, setMouthOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [isInitializingAI, setIsInitializingAI] = useState(false);

  const mouthOpenRef = useRef(setMouthOpen);
  mouthOpenRef.current = setMouthOpen;
  const appliedSystemPromptRef = useRef(settings.llmSystemPrompt);

  // 初期化
  useEffect(() => {
    const initialMessages = loadMessages();
    setMessages(initialMessages);
    initLLM(initialMessages);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS エンジン設定を facade に反映
  useEffect(() => {
    tts.setEngine(settings.ttsEngine).catch((e) => {
      console.warn("TTS engine switch error:", e);
    });
  }, [settings.ttsEngine]);

  async function initLLM(initialMessages: ChatMessage[] = []) {
    const status = await llm.checkAvailability();
    setLlmStatus(status);

    switch (status) {
      case "available":
        setNeedsInitialization(false);
        setStatusText("");
        if (!llm.hasSession()) {
          try {
            await llm.createSession(
              settings.llmSystemPrompt,
              getContextHistory(initialMessages)
            );
            appliedSystemPromptRef.current = settings.llmSystemPrompt;
          } catch (e) {
            setNeedsInitialization(true);
            setStatusText(
              getLLMErrorMessage(
                e,
                t("chat.status.sessionCreateFailed"),
                t("chat.status.userGestureRequired"),
                t
              )
            );
            setLlmStatus("error");
          }
        }
        break;
      case "downloading":
        setNeedsInitialization(true);
        setStatusText(t("chat.status.pressPrepare"));
        break;
      case "unavailable":
        setNeedsInitialization(false);
        setStatusText(t("chat.status.unavailable"));
        break;
      case "error":
        setNeedsInitialization(false);
        setStatusText(t("chat.status.checkFailed"));
        break;
    }
  }

  useEffect(() => {
    if (appliedSystemPromptRef.current === settings.llmSystemPrompt) return;
    if (isSending || llmStatus !== "available") return;

    let cancelled = false;

    async function recreateSession() {
      setStatusText(t("chat.status.sessionUpdating"));
      llm.destroySession();

      try {
        await llm.createSession(
          settings.llmSystemPrompt,
          getContextHistory(messages)
        );

        if (!cancelled) {
          appliedSystemPromptRef.current = settings.llmSystemPrompt;
          setStatusText("");
        }
      } catch (e) {
        if (!cancelled) {
          setNeedsInitialization(true);
          setLlmStatus("error");
          setErrorMessage(
            getLLMErrorMessage(
              e,
              t("chat.status.sessionUpdateFailed"),
              t("chat.status.userGestureRequired"),
              t
            )
          );
          setStatusText(t("chat.status.sessionUpdateFailed"));
        }
      }
    }

    void recreateSession();

    return () => {
      cancelled = true;
    };
  }, [isSending, llmStatus, messages, settings.llmSystemPrompt, t]);

  const initializeAI = useCallback(async () => {
    if (isInitializingAI) return;

    setIsInitializingAI(true);
    setNeedsInitialization(true);
    setLlmStatus("downloading");
    setStatusText(t("chat.status.modelPreparing"));
    setErrorMessage("");

    try {
      await llm.createSession(
        settings.llmSystemPrompt,
        getContextHistory(messages),
        (pct) => {
          setStatusText(t("chat.status.modelDownloading", { pct }));
        }
      );
      appliedSystemPromptRef.current = settings.llmSystemPrompt;
      setNeedsInitialization(false);
      setLlmStatus("available");
      setStatusText("");
    } catch (e) {
      setNeedsInitialization(true);
      setLlmStatus("downloading");
      const message = getLLMErrorMessage(
        e,
        t("chat.status.modelPrepareFailed"),
        t("chat.status.userGestureRequired"),
        t
      );
      setErrorMessage(message);
      setStatusText(message);
    } finally {
      setIsInitializingAI(false);
    }
  }, [isInitializingAI, messages, settings.llmSystemPrompt, t]);

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      if (isSending || !text.trim()) return;
      setIsSending(true);

      tts.stop();
      mouthOpenRef.current(false);

      if (!llm.hasSession()) {
        if (llmStatus !== "available") {
          const message = needsInitialization
            ? t("chat.status.pressPrepareFirst")
            : t("chat.status.notAvailable");
          setErrorMessage(message);
          setStatusText(message);
          setIsSending(false);
          return;
        }

        try {
          await llm.createSession(
            settings.llmSystemPrompt,
            getContextHistory(messages)
          );
          appliedSystemPromptRef.current = settings.llmSystemPrompt;
        } catch (e) {
          setErrorMessage(
            getLLMErrorMessage(
              e,
              t("chat.status.sessionCreateFailed"),
              t("chat.status.userGestureRequired"),
              t
            )
          );
          setIsSending(false);
          return;
        }
      }

      const source = options?.source;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        source: source ?? "chat",
        ...(options?.sender && {
          senderName: options.sender.name,
          senderIconUrl: options.sender.iconUrl,
        }),
      };

      const updatedWithUser = [...messages, userMsg];
      setMessages(updatedWithUser);
      saveMessages(updatedWithUser);

      try {
        const reply = await llm.prompt(text.trim());
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
          source: source ?? "chat",
        };
        const updatedWithReply = [...updatedWithUser, assistantMsg];
        setMessages(updatedWithReply);
        saveMessages(updatedWithReply);

        if (settings.ttsEnabled) {
          if (!tts.isReady()) {
            setStatusText(t("chat.status.ttsInitializing"));
            try {
              await tts.initialize((msg) => {
                if (msg) setStatusText(msg);
              });
              setStatusText("");
            } catch (e) {
              setErrorMessage(
                getTtsErrorMessage(e, t("chat.status.ttsInitializeFailed"), t)
              );
              console.warn("TTS init error:", e);
              setStatusText("");
            }
          }
          tts
            .speak(
              reply,
              (open) => mouthOpenRef.current(open),
              toTtsLengthScale(settings.ttsLengthScale)
            )
            .catch((e) => {
              setErrorMessage(
                getTtsErrorMessage(e, t("chat.status.ttsPlaybackFailed"), t)
              );
              console.warn("TTS error:", e);
            });
        }
      } catch (e) {
        setErrorMessage(t("chat.status.responseFailed"));
        console.error("LLM error:", e);
        llm.destroySession();
      } finally {
        setIsSending(false);
      }
    },
    [isSending, llmStatus, messages, needsInitialization, settings, t]
  );

  const reset = useCallback(async () => {
    tts.stop();
    mouthOpenRef.current(false);
    llm.destroySession();
    setMessages([]);
    saveMessages([]);
    setNeedsInitialization(false);
    try {
      const status = await llm.checkAvailability();
      setLlmStatus(status);

      if (status === "available") {
        await llm.createSession(settings.llmSystemPrompt);
        appliedSystemPromptRef.current = settings.llmSystemPrompt;
        setStatusText("");
        return;
      }

      if (status === "downloading") {
        setNeedsInitialization(true);
        setStatusText(t("chat.status.pressPrepare"));
        return;
      }

      if (status === "unavailable") {
        setStatusText(t("chat.status.unavailable"));
        return;
      }

      setStatusText(t("chat.status.checkFailed"));
    } catch (e) {
      setNeedsInitialization(true);
      setLlmStatus("error");
      setStatusText(
        getLLMErrorMessage(
          e,
          t("chat.status.reinitializeFailed"),
          t("chat.status.userGestureRequired"),
          t
        )
      );
    }
  }, [settings.llmSystemPrompt, t]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    messages,
    isSending,
    llmStatus,
    statusText,
    mouthOpen,
    errorMessage,
    canInitializeAI: needsInitialization || isInitializingAI,
    isInitializingAI,
    initializeAI,
    send,
    reset,
    clearError,
  };
}
