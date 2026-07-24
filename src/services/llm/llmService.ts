/**
 * LLM Service — Chrome Built-in AI (Prompt API / LanguageModel)
 */

import {
  DEFAULT_PROMPT_EXAMPLES_EN,
  DEFAULT_PROMPT_EXAMPLES_JA,
  DEFAULT_SYSTEM_PROMPT_EN,
  DEFAULT_SYSTEM_PROMPT_JA,
} from "../../types";

// Current LanguageModel API types.
declare global {
  interface Window {
    LanguageModel?: LanguageModelAPI;
  }
  var LanguageModel: LanguageModelAPI | undefined;
}

interface LanguageModelAPI {
  availability(options?: ModelOptions): Promise<string>;
  create(options?: CreateOptions): Promise<LanguageModelSession>;
}

interface ModelOptions {
  expectedInputs?: Array<{ type: string; languages: string[] }>;
  expectedOutputs?: Array<{ type: string; languages: string[] }>;
}

interface CreateOptions extends ModelOptions {
  initialPrompts?: LanguageModelMessage[];
  monitor?: (m: DownloadMonitor) => void;
}

interface LanguageModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DownloadMonitor {
  addEventListener(
    event: "downloadprogress",
    handler: (e: { loaded: number }) => void
  ): void;
}

interface LanguageModelSession {
  prompt(text: string): Promise<string>;
  destroy(): void;
}

export type LLMStatus =
  | "checking"
  | "available"
  | "downloading"
  | "unavailable"
  | "error";

const MODEL_IO = Object.freeze({
  expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
  expectedOutputs: [{ type: "text", languages: ["ja", "en"] }],
});

let session: LanguageModelSession | null = null;
let sessionCreation: Promise<void> | null = null;
let sessionCreationKey: string | null = null;
let sessionCreationGeneration = -1;
let sessionGeneration = 0;

function getDefaultExamples(systemPrompt: string): LanguageModelMessage[] {
  if (systemPrompt === DEFAULT_SYSTEM_PROMPT_JA) {
    return [...DEFAULT_PROMPT_EXAMPLES_JA];
  }
  if (systemPrompt === DEFAULT_SYSTEM_PROMPT_EN) {
    return [...DEFAULT_PROMPT_EXAMPLES_EN];
  }
  return [];
}

export function isAvailable(): boolean {
  return typeof LanguageModel !== "undefined";
}

export async function checkAvailability(): Promise<LLMStatus> {
  if (!isAvailable()) return "unavailable";
  try {
    const status = await LanguageModel!.availability(MODEL_IO);
    if (status === "available") return "available";
    if (status === "downloadable" || status === "downloading")
      return "downloading";
    return "unavailable";
  } catch {
    return "error";
  }
}

export async function createSession(
  systemPrompt: string,
  contextHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [],
  onDownloadProgress?: (pct: number) => void
): Promise<void> {
  const recentHistory = contextHistory.slice(-20);
  const creationKey = JSON.stringify([systemPrompt, recentHistory]);

  if (sessionCreation) {
    const pendingCreation = sessionCreation;
    if (
      sessionCreationKey === creationKey &&
      sessionCreationGeneration === sessionGeneration
    ) {
      return pendingCreation;
    }

    try {
      await pendingCreation;
    } catch {
      // A newer request should still get a chance to create its own session.
    }
    return createSession(systemPrompt, contextHistory, onDownloadProgress);
  }

  const creationGeneration = sessionGeneration;
  const create = async () => {
    const initialPrompts: LanguageModelMessage[] = [
      { role: "system", content: systemPrompt },
      ...getDefaultExamples(systemPrompt),
      ...recentHistory,
    ];
    const options: CreateOptions = { ...MODEL_IO, initialPrompts };
    if (onDownloadProgress) {
      options.monitor = (m) => {
        m.addEventListener("downloadprogress", (e) => {
          onDownloadProgress(Math.round((e.loaded || 0) * 100));
        });
      };
    }

    const nextSession = await LanguageModel!.create(options);
    if (creationGeneration !== sessionGeneration) {
      try {
        nextSession.destroy();
      } catch {
        // The stale session is already unusable.
      }
      return;
    }

    const previousSession = session;
    session = nextSession;
    if (previousSession) {
      try {
        previousSession.destroy();
      } catch {
        // The replacement session is already active.
      }
    }
  };

  const pendingCreation = create();
  sessionCreation = pendingCreation;
  sessionCreationKey = creationKey;
  sessionCreationGeneration = creationGeneration;

  try {
    await pendingCreation;
  } finally {
    if (sessionCreation === pendingCreation) {
      sessionCreation = null;
      sessionCreationKey = null;
      sessionCreationGeneration = -1;
    }
  }
}

export async function prompt(text: string): Promise<string> {
  if (!session) throw new Error("LLM session not created");
  return session.prompt(text);
}

export function destroySession(): void {
  sessionGeneration += 1;
  if (session) {
    try {
      session.destroy();
    } catch {
      // ignore
    }
    session = null;
  }
}

export function hasSession(): boolean {
  return session !== null;
}
