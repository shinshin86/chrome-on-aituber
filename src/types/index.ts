// Chat
export type ChatSource = "chat" | "youtube" | "twitch";

export const CHAT_SOURCE_LABELS: Record<ChatSource, string> = {
  chat: "chat",
  youtube: "youtubeコメント",
  twitch: "twitchコメント",
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

// Settings
export interface AppSettings {
  appMode: AppMode;
  ttsEnabled: boolean;
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
  appMode: "chat",
  ttsEnabled: true,
  selectedAvatarId: "default",
  backgroundImageEnabled: false,
  backgroundImageUpdatedAt: 0,
  llmSystemPrompt:
    "あなたは配信者として視聴者とチャットで会話するAIアバターです。フレンドリーで親しみやすいキャラクターとして振る舞ってください。\n\n【重要なルール】\n- 応答は1〜3文程度の短さにとどめてください。長文は禁止です。\n- 話し言葉で、テンポよく返してください。\n- マークダウンや記号での装飾は使わず、プレーンテキストで返してください。\n- 視聴者のコメントにはリアクションを交えて楽しく返しましょう。",
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
