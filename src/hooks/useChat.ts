import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, AppSettings } from "../types";
import * as llm from "../services/llm/llmService";
import * as tts from "../services/tts/ttsService";
import {
  loadMessages,
  saveMessages,
} from "../services/storage/storageService";

export type LLMStatus = "checking" | "available" | "downloading" | "unavailable" | "error";

export function useChat(settings: AppSettings) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LLMStatus>("checking");
  const [statusText, setStatusText] = useState("AI を確認中...");
  const [mouthOpen, setMouthOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        setStatusText("");
        if (!llm.hasSession()) {
          try {
            await llm.createSession(
              settings.llmSystemPrompt,
              initialMessages.map((m) => ({ role: m.role, content: m.content }))
            );
            appliedSystemPromptRef.current = settings.llmSystemPrompt;
          } catch (e) {
            setStatusText("セッション作成失敗: " + (e as Error).message);
          }
        }
        break;
      case "downloading":
        setStatusText("モデルをダウンロード中...");
        try {
          await llm.createSession(
            settings.llmSystemPrompt,
            initialMessages.map((m) => ({ role: m.role, content: m.content })),
            (pct) => {
              setStatusText(`モデルをダウンロード中... ${pct}%`);
            }
          );
          appliedSystemPromptRef.current = settings.llmSystemPrompt;
          setLlmStatus("available");
          setStatusText("");
        } catch (e) {
          setStatusText("モデルダウンロード失敗: " + (e as Error).message);
          setLlmStatus("error");
        }
        break;
      case "unavailable":
        setStatusText(
          "Built-in AI が利用できません。Chrome 138+ でフラグを有効化してください"
        );
        break;
      case "error":
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
          messages.map((m) => ({ role: m.role, content: m.content }))
        );

        if (!cancelled) {
          appliedSystemPromptRef.current = settings.llmSystemPrompt;
          setStatusText("");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMessage("AI セッションの更新に失敗しました: " + (e as Error).message);
          setStatusText("AI セッションの更新に失敗しました");
        }
      }
    }

    void recreateSession();

    return () => {
      cancelled = true;
    };
  }, [isSending, llmStatus, messages, settings.llmSystemPrompt]);

  const send = useCallback(
    async (text: string, sender?: { name: string; iconUrl?: string }) => {
      if (isSending || !text.trim()) return;
      setIsSending(true);

      tts.stop();
      mouthOpenRef.current(false);

      if (!llm.hasSession()) {
        try {
          await llm.createSession(
            settings.llmSystemPrompt,
            messages.map((m) => ({ role: m.role, content: m.content }))
          );
          appliedSystemPromptRef.current = settings.llmSystemPrompt;
        } catch (e) {
          setErrorMessage("AI セッションの作成に失敗しました: " + (e as Error).message);
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
          tts.speak(reply, (open) => mouthOpenRef.current(open), settings.ttsLengthScale).catch((e) => {
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
    [isSending, messages, settings]
  );

  const reset = useCallback(async () => {
    tts.stop();
    mouthOpenRef.current(false);
    llm.destroySession();
    setMessages([]);
    saveMessages([]);
    try {
      await llm.createSession(settings.llmSystemPrompt);
      appliedSystemPromptRef.current = settings.llmSystemPrompt;
    } catch {
      // ignore
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
    send,
    reset,
    clearError,
  };
}
