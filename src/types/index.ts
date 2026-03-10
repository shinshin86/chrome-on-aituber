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

// Streaming platform
export type StreamingPlatform = "youtube" | "twitch";

// Settings
export interface AppSettings {
  appMode: AppMode;
  ttsEnabled: boolean;
  selectedAvatarId: string;
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
  appMode: "chat",
  ttsEnabled: true,
  selectedAvatarId: "default",
  llmSystemPrompt:
    "あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に丁寧に日本語で回答してください。回答はマークダウンではなくプレーンテキストで返してください。",
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
