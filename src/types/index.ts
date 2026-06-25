// Chat
export type ChatSource = "chat" | "youtube" | "twitch";

export const CHAT_SOURCE_LABELS: Record<ChatSource, string> = {
  chat: "chat",
  youtube: "youtubeコメント",
  twitch: "twitchコメント",
};

export type Language = "ja" | "en";

export const LANGUAGE_LABELS: Record<Language, string> = {
  ja: "日本語",
  en: "English",
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  source?: ChatSource;
  senderName?: string;
  senderIconUrl?: string;
}

// Avatar
export interface AvatarPack {
  id: string;
  name: string;
  images: AvatarImages;
  isBuiltIn: boolean;
}

export interface AvatarImages {
  mouthCloseEyesOpen: string;
  mouthCloseEyesClose: string;
  mouthOpenEyesOpen: string;
  mouthOpenEyesClose: string;
}

// App mode
export type AppMode = "chat" | "broadcast";

// Streaming platform
export type StreamingPlatform = "youtube" | "twitch";

// TTS
export type TtsEngine = "piper" | "irodori";

export const TTS_ENGINE_LABELS: Record<TtsEngine, string> = {
  piper: "Piper Plus（標準）",
  irodori: "Irodori TTS（WebGPU / 高品質）",
};

export const DEFAULT_SYSTEM_PROMPT_JA =
  "あなたは配信者として視聴者とチャットで会話するAIアバターです。フレンドリーで親しみやすいキャラクターとして振る舞ってください。\n\n【重要なルール】\n- 応答は1〜3文程度の短さにとどめてください。長文は禁止です。\n- 話し言葉で、テンポよく返してください。\n- マークダウンや記号での装飾は使わず、プレーンテキストで返してください。\n- 視聴者のコメントにはリアクションを交えて楽しく返しましょう。";

export const DEFAULT_SYSTEM_PROMPT_EN =
  "You are an AI avatar who chats with viewers as a livestream host. Act as a friendly and approachable character.\n\nImportant rules:\n- Keep each response short, around 1 to 3 sentences. Do not write long replies.\n- Use casual spoken language and keep the pace lively.\n- Do not use Markdown or decorative symbols; reply in plain text.\n- React to viewer comments and keep the conversation fun.";

export function isDefaultSystemPrompt(value: string): boolean {
  return value === DEFAULT_SYSTEM_PROMPT_JA || value === DEFAULT_SYSTEM_PROMPT_EN;
}

// Settings
export interface AppSettings {
  language: Language;
  appMode: AppMode;
  ttsEnabled: boolean;
  ttsEngine: TtsEngine;
  selectedAvatarId: string;
  backgroundImageEnabled: boolean;
  backgroundImageUpdatedAt: number;
  llmSystemPrompt: string;
  ttsLengthScale: number;
  // Streaming platform
  streamingPlatform: StreamingPlatform;
  // YouTube Live
  youtubeApiKey: string;
  youtubeLiveId: string;
  youtubeEnabled: boolean;
  youtubeCommentInterval: number;
  // Twitch
  twitchClientId: string;
  twitchAccessToken: string;
  twitchChannel: string;
  twitchEnabled: boolean;
  twitchCommentInterval: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "ja",
  appMode: "chat",
  ttsEnabled: true,
  ttsEngine: "piper",
  selectedAvatarId: "default",
  backgroundImageEnabled: false,
  backgroundImageUpdatedAt: 0,
  llmSystemPrompt: DEFAULT_SYSTEM_PROMPT_JA,
  ttsLengthScale: 1.0,
  streamingPlatform: "youtube",
  youtubeApiKey: "",
  youtubeLiveId: "",
  youtubeEnabled: false,
  youtubeCommentInterval: 20000,
  twitchClientId: "",
  twitchAccessToken: "",
  twitchChannel: "",
  twitchEnabled: false,
  twitchCommentInterval: 20000,
};
