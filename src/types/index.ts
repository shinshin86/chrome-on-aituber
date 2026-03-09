// Chat
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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

// Settings
export interface AppSettings {
  appMode: AppMode;
  ttsEnabled: boolean;
  selectedAvatarId: string;
  llmSystemPrompt: string;
  ttsLengthScale: number;
  // YouTube Live
  youtubeApiKey: string;
  youtubeLiveId: string;
  youtubeEnabled: boolean;
  youtubeCommentInterval: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  appMode: "chat",
  ttsEnabled: true,
  selectedAvatarId: "default",
  llmSystemPrompt:
    "あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に丁寧に日本語で回答してください。回答はマークダウンではなくプレーンテキストで返してください。",
  ttsLengthScale: 1.0,
  youtubeApiKey: "",
  youtubeLiveId: "",
  youtubeEnabled: false,
  youtubeCommentInterval: 20000,
};
