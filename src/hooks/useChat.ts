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

  const mouthOpenRef = useRef(setMouthOpen);
  mouthOpenRef.current = setMouthOpen;

  // 初期化
  useEffect(() => {
    setMessages(loadMessages());
    initLLM();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function initLLM() {
    const status = await llm.checkAvailability();
    setLlmStatus(status);

    switch (status) {
      case "available":
        setStatusText("");
        if (!llm.hasSession()) {
          try {
            await llm.createSession(settings.llmSystemPrompt);
          } catch (e) {
            setStatusText("セッション作成失敗: " + (e as Error).message);
          }
        }
        break;
      case "downloading":
        setStatusText("モデルをダウンロード中...");
        try {
          await llm.createSession(settings.llmSystemPrompt, [], (pct) => {
            setStatusText(`モデルをダウンロード中... ${pct}%`);
          });
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
        } catch {
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
              console.warn("TTS init error:", e);
              setStatusText("");
            }
          }
          tts.speak(reply, (open) => mouthOpenRef.current(open), settings.ttsLengthScale).catch((e) => {
            console.warn("TTS error:", e);
          });
        }
      } catch (e) {
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
    } catch {
      // ignore
    }
  }, [settings.llmSystemPrompt]);

  return {
    messages,
    isSending,
    llmStatus,
    statusText,
    mouthOpen,
    send,
    reset,
  };
}
