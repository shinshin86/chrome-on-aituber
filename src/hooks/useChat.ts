import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, AppSettings } from "../types";
import * as llm from "../services/llm/llmService";
import * as tts from "../services/tts/ttsService";
import {
  loadMessages,
  saveMessages,
} from "../services/storage/storageService";

export type LLMStatus = "checking" | "available" | "downloading" | "unavailable" | "error";

function getContextHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function getLLMErrorMessage(error: unknown, fallback: string): string {
  const detail = error instanceof Error ? error.message : "";

  if (/requires a user gesture/i.test(detail)) {
    return "AI モデルの準備は「AI を準備」ボタンから開始してください";
  }

  return detail ? `${fallback}: ${detail}` : fallback;
}

function toTtsLengthScale(speedMultiplier: number): number {
  // Piper's lengthScale controls utterance duration, so larger values make speech slower.
  // The UI exposes speed, therefore we invert the slider value before passing it to TTS.
  return speedMultiplier > 0 ? 1 / speedMultiplier : 1;
}

export function useChat(settings: AppSettings) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LLMStatus>("checking");
  const [statusText, setStatusText] = useState("AI を確認中...");
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
            setStatusText(getLLMErrorMessage(e, "AI セッションの作成に失敗しました"));
            setLlmStatus("error");
          }
        }
        break;
      case "downloading":
        setNeedsInitialization(true);
        setStatusText("AI を使うには「AI を準備」を押してください");
        break;
      case "unavailable":
        setNeedsInitialization(false);
        setStatusText(
          "Built-in AI が利用できません。Chrome 138+ でフラグを有効化してください"
        );
        break;
      case "error":
        setNeedsInitialization(false);
        setStatusText("AI の確認に失敗しました");
        break;
    }
  }

  useEffect(() => {
    if (appliedSystemPromptRef.current === settings.llmSystemPrompt) return;
    if (isSending || llmStatus !== "available") return;

    let cancelled = false;

    async function recreateSession() {
      setStatusText("AI セッションを更新中...");
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
          setErrorMessage(getLLMErrorMessage(e, "AI セッションの更新に失敗しました"));
          setStatusText("AI セッションの更新に失敗しました");
        }
      }
    }

    void recreateSession();

    return () => {
      cancelled = true;
    };
  }, [isSending, llmStatus, messages, settings.llmSystemPrompt]);

  const initializeAI = useCallback(async () => {
    if (isInitializingAI) return;

    setIsInitializingAI(true);
    setNeedsInitialization(true);
    setLlmStatus("downloading");
    setStatusText("AI モデルを準備中...");
    setErrorMessage("");

    try {
      await llm.createSession(
        settings.llmSystemPrompt,
        getContextHistory(messages),
        (pct) => {
          setStatusText(`AI モデルをダウンロード中... ${pct}%`);
        }
      );
      appliedSystemPromptRef.current = settings.llmSystemPrompt;
      setNeedsInitialization(false);
      setLlmStatus("available");
      setStatusText("");
    } catch (e) {
      setNeedsInitialization(true);
      setLlmStatus("downloading");
      const message = getLLMErrorMessage(e, "AI モデルの準備に失敗しました");
      setErrorMessage(message);
      setStatusText(message);
    } finally {
      setIsInitializingAI(false);
    }
  }, [isInitializingAI, messages, settings.llmSystemPrompt]);

  const send = useCallback(
    async (text: string, sender?: { name: string; iconUrl?: string }) => {
      if (isSending || !text.trim()) return;
      setIsSending(true);

      tts.stop();
      mouthOpenRef.current(false);

      if (!llm.hasSession()) {
        if (llmStatus !== "available") {
          const message = needsInitialization
            ? "AI を使うには先に「AI を準備」を押してください"
            : "AI が利用できる状態ではありません";
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
          setErrorMessage(getLLMErrorMessage(e, "AI セッションの作成に失敗しました"));
          setIsSending(false);
          return;
        }
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        ...(sender && {
          senderName: sender.name,
          senderIconUrl: sender.iconUrl,
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
        };
        const updatedWithReply = [...updatedWithUser, assistantMsg];
        setMessages(updatedWithReply);
        saveMessages(updatedWithReply);

        if (settings.ttsEnabled) {
          if (!tts.isReady()) {
            setStatusText("音声エンジンを初期化中...");
            try {
              await tts.initialize((msg) => {
                if (msg) setStatusText(msg);
              });
              setStatusText("");
            } catch (e) {
              setErrorMessage("音声エンジンの初期化に失敗しました");
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
              setErrorMessage("音声の再生に失敗しました");
              console.warn("TTS error:", e);
            });
        }
      } catch (e) {
        setErrorMessage("AI の応答生成に失敗しました");
        console.error("LLM error:", e);
        llm.destroySession();
      } finally {
        setIsSending(false);
      }
    },
    [isSending, llmStatus, messages, needsInitialization, settings]
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
        setStatusText("AI を使うには「AI を準備」を押してください");
        return;
      }

      if (status === "unavailable") {
        setStatusText(
          "Built-in AI が利用できません。Chrome 138+ でフラグを有効化してください"
        );
        return;
      }

      setStatusText("AI の確認に失敗しました");
    } catch (e) {
      setNeedsInitialization(true);
      setLlmStatus("error");
      setStatusText(getLLMErrorMessage(e, "AI の再初期化に失敗しました"));
    }
  }, [settings.llmSystemPrompt]);

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
