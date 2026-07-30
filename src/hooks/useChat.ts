import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n, type I18nKey, type I18nParams } from "../i18n/useI18n";
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

const SYSTEM_PROMPT_UPDATE_DELAY_MS = 500;

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
  const [mouthLevel, setMouthLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [isInitializingAI, setIsInitializingAI] = useState(false);
  const [isSessionInitializing, setIsSessionInitializing] = useState(true);

  const messagesRef = useRef<ChatMessage[]>([]);
  const isSendingRef = useRef(false);
  const mouthLevelRef = useRef(setMouthLevel);
  mouthLevelRef.current = setMouthLevel;
  const appliedSystemPromptRef = useRef(settings.llmSystemPrompt);
  const sessionInitializationCountRef = useRef(0);

  const beginSessionInitialization = useCallback(() => {
    sessionInitializationCountRef.current += 1;
    setIsSessionInitializing(true);
  }, []);

  const endSessionInitialization = useCallback(() => {
    sessionInitializationCountRef.current = Math.max(
      0,
      sessionInitializationCountRef.current - 1
    );
    if (sessionInitializationCountRef.current === 0) {
      setIsSessionInitializing(false);
    }
  }, []);

  // 初期化
  useEffect(() => {
    const initialMessages = loadMessages();
    messagesRef.current = initialMessages;
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
    beginSessionInitialization();

    try {
      const status = await llm.checkAvailability();
      setLlmStatus(status);

      switch (status) {
        case "available":
          setNeedsInitialization(false);
          if (!llm.hasSession()) {
            setStatusText(t("chat.status.sessionCreating"));
            await llm.createSession(
              settings.llmSystemPrompt,
              getContextHistory(initialMessages)
            );
            appliedSystemPromptRef.current = settings.llmSystemPrompt;
          }
          setStatusText("");
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
    } finally {
      endSessionInitialization();
    }
  }

  useEffect(() => {
    if (
      appliedSystemPromptRef.current === settings.llmSystemPrompt &&
      llm.hasSession()
    ) {
      return;
    }
    if (isSending || llmStatus !== "available") return;

    let cancelled = false;
    let recreationStarted = false;
    let recreationFinished = false;
    beginSessionInitialization();
    setStatusText(t("chat.status.sessionUpdating"));
    const timer = window.setTimeout(() => {
      recreationStarted = true;
      void recreateSession();
    }, SYSTEM_PROMPT_UPDATE_DELAY_MS);

    async function recreateSession() {
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
      } finally {
        recreationFinished = true;
        endSessionInitialization();
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (!recreationStarted) {
        endSessionInitialization();
      } else if (!recreationFinished) {
        llm.destroySession();
      }
    };
  }, [
    beginSessionInitialization,
    endSessionInitialization,
    isSending,
    llmStatus,
    messages,
    settings.llmSystemPrompt,
    t,
  ]);

  const initializeAI = useCallback(async () => {
    if (isInitializingAI) return;

    setIsInitializingAI(true);
    setNeedsInitialization(true);
    setLlmStatus("downloading");
    setStatusText(t("chat.status.modelPreparing"));
    setErrorMessage("");
    beginSessionInitialization();

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
      endSessionInitialization();
    }
  }, [
    beginSessionInitialization,
    endSessionInitialization,
    isInitializingAI,
    messages,
    settings.llmSystemPrompt,
    t,
  ]);

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      if (isSendingRef.current || !text.trim()) return;
      isSendingRef.current = true;
      setIsSending(true);

      try {
        tts.stop();
        mouthLevelRef.current(0);
        setIsSpeaking(false);

        if (!llm.hasSession()) {
          if (llmStatus !== "available") {
            const message = needsInitialization
              ? t("chat.status.pressPrepareFirst")
              : t("chat.status.notAvailable");
            setErrorMessage(message);
            setStatusText(message);
            return;
          }

          beginSessionInitialization();
          setStatusText(t("chat.status.sessionCreating"));
          try {
            await llm.createSession(
              settings.llmSystemPrompt,
              getContextHistory(messagesRef.current)
            );
            appliedSystemPromptRef.current = settings.llmSystemPrompt;
            setStatusText("");
          } catch (e) {
            setErrorMessage(
              getLLMErrorMessage(
                e,
                t("chat.status.sessionCreateFailed"),
                t("chat.status.userGestureRequired"),
                t
              )
            );
            return;
          } finally {
            endSessionInitialization();
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

        const updatedWithUser = [...messagesRef.current, userMsg];
        messagesRef.current = updatedWithUser;
        setMessages((prev) => [...prev, userMsg]);
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
          const updatedWithReply = [...messagesRef.current, assistantMsg];
          messagesRef.current = updatedWithReply;
          setMessages((prev) => [...prev, assistantMsg]);
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
            setIsSpeaking(true);
            void tts
              .speak(
                reply,
                (level) => mouthLevelRef.current(level),
                toTtsLengthScale(settings.ttsLengthScale)
              )
              .catch((e) => {
                setErrorMessage(
                  getTtsErrorMessage(e, t("chat.status.ttsPlaybackFailed"), t)
                );
                console.warn("TTS error:", e);
              })
              .finally(() => {
                mouthLevelRef.current(0);
                setIsSpeaking(false);
              });
          }
        } catch (e) {
          setErrorMessage(t("chat.status.responseFailed"));
          console.error("LLM error:", e);
          llm.destroySession();
        }
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [
      beginSessionInitialization,
      endSessionInitialization,
      llmStatus,
      needsInitialization,
      settings,
      t,
    ]
  );

  const reset = useCallback(async () => {
    tts.stop();
    mouthLevelRef.current(0);
    setIsSpeaking(false);
    llm.destroySession();
    messagesRef.current = [];
    setMessages([]);
    saveMessages([]);
    setNeedsInitialization(false);
    beginSessionInitialization();
    setStatusText(t("chat.status.sessionCreating"));
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
    } finally {
      endSessionInitialization();
    }
  }, [
    beginSessionInitialization,
    endSessionInitialization,
    settings.llmSystemPrompt,
    t,
  ]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    messages,
    isSending,
    llmStatus,
    statusText,
    mouthLevel,
    mouthOpen: mouthLevel > 0.18,
    isSpeaking,
    errorMessage,
    canInitializeAI: needsInitialization || isInitializingAI,
    isInitializingAI,
    isSessionInitializing,
    initializeAI,
    send,
    reset,
    clearError,
  };
}
