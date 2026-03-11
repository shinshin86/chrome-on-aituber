/**
 * LLM Service — Chrome Built-in AI (Prompt API / LanguageModel)
 */

// LanguageModel API の型定義（Chrome 138+）
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
  systemPrompt?: string;
  monitor?: (m: DownloadMonitor) => void;
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
  expectedInputs: [{ type: "text", languages: ["ja"] }],
  expectedOutputs: [{ type: "text", languages: ["ja"] }],
});

let session: LanguageModelSession | null = null;
let creatingSession = false;

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
  contextHistory: Array<{ role: string; content: string }> = [],
  onDownloadProgress?: (pct: number) => void
): Promise<void> {
  if (creatingSession) return;
  creatingSession = true;

  try {
    let prompt = systemPrompt;
    if (contextHistory.length > 0) {
      const history = contextHistory
        .slice(-20)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      prompt += `\n\n以下はこれまでの会話履歴です。この文脈を踏まえて回答してください:\n${history}`;
    }

    const options: CreateOptions = { ...MODEL_IO, systemPrompt: prompt };
    if (onDownloadProgress) {
      options.monitor = (m) => {
        m.addEventListener("downloadprogress", (e) => {
          onDownloadProgress(Math.round((e.loaded || 0) * 100));
        });
      };
    }

    session = await LanguageModel!.create(options);
  } finally {
    creatingSession = false;
  }
}

export async function prompt(text: string): Promise<string> {
  if (!session) throw new Error("LLM session not created");
  return session.prompt(text);
}

export function destroySession(): void {
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
