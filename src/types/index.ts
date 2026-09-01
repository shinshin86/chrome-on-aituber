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
export type AvatarKind =
  | "png"
  | "purupuru"
  | "pet"
  | "vrm"
  | "psd"
  | "inochi2d";

export const AVATAR_KIND_LABELS: Record<AvatarKind, string> = {
  png: "PNGTuber",
  purupuru: "ぷるぷるPNGTuber",
  pet: "Pet",
  vrm: "VRM",
  psd: "PSD",
  inochi2d: "Inochi2D",
};

interface AvatarPackBase {
  id: string;
  name: string;
  kind: AvatarKind;
  isBuiltIn: boolean;
  thumbnailUrl?: string;
  dispose?: () => void;
}

export interface AvatarImages {
  mouthCloseEyesOpen: string;
  mouthCloseEyesClose: string;
  mouthOpenEyesOpen: string;
  mouthOpenEyesClose: string;
}

export interface PetManifest {
  id?: string;
  displayName?: string;
  description?: string;
  spritesheetPath?: string;
}

export type AvatarPack =
  | (AvatarPackBase & {
      kind: "png";
      images: AvatarImages;
    })
  | (AvatarPackBase & {
      kind: "purupuru";
      packageUrl: string;
    })
  | (AvatarPackBase & {
      kind: "pet";
      manifest: PetManifest;
      spritesheetUrl: string;
    })
  | (AvatarPackBase & {
      kind: "vrm";
      modelUrl: string;
      animationUrl?: string;
    })
  | (AvatarPackBase & {
      kind: "psd";
      modelUrl: string;
    })
  | (AvatarPackBase & {
      kind: "inochi2d";
      modelUrl?: string;
      motionUrl?: string;
      manifestModelId?: string;
    });

export interface AvatarViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface VrmViewTransform {
  cameraPosition: [number, number, number];
  target: [number, number, number];
}

export const PSD_MOTION_INTENSITY_MIN = 0;
export const PSD_MOTION_INTENSITY_MAX = 2;
export const PSD_MOTION_INTENSITY_DEFAULT = 1;

export function normalizePsdMotionIntensity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PSD_MOTION_INTENSITY_DEFAULT;
  }
  return Math.min(
    PSD_MOTION_INTENSITY_MAX,
    Math.max(PSD_MOTION_INTENSITY_MIN, value)
  );
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

const LEGACY_DEFAULT_SYSTEM_PROMPT_JA =
  "あなたは配信者として視聴者とチャットで会話するAIアバターです。フレンドリーで親しみやすいキャラクターとして振る舞ってください。\n\n【重要なルール】\n- 応答は1〜3文程度の短さにとどめてください。長文は禁止です。\n- 話し言葉で、テンポよく返してください。\n- マークダウンや記号での装飾は使わず、プレーンテキストで返してください。\n- 視聴者のコメントにはリアクションを交えて楽しく返しましょう。";

const LEGACY_DEFAULT_SYSTEM_PROMPT_EN =
  "You are an AI avatar who chats with viewers as a livestream host. Act as a friendly and approachable character.\n\nImportant rules:\n- Keep each response short, around 1 to 3 sentences. Do not write long replies.\n- Use casual spoken language and keep the pace lively.\n- Do not use Markdown or decorative symbols; reply in plain text.\n- React to viewer comments and keep the conversation fun.";

export const DEFAULT_SYSTEM_PROMPT_JA =
  "あなたは配信者として視聴者とチャットで会話するAIアバターです。フレンドリーで親しみやすいキャラクターとして振る舞ってください。\n\n【重要なルール】\n- 返答は原則1文にしてください。自然さに必要な場合のみ2文まで使えます。\n- 前置き、要約、箇条書きは使わず、リアクションと答えを一息で読める短さで返してください。\n- 詳しい説明を明示的に求められた場合だけ短く補足し、その場合も3文以内にしてください。\n- 話し言葉で、テンポよく返してください。\n- マークダウンや記号での装飾は使わず、プレーンテキストで返してください。\n- 視聴者のコメントにはリアクションを交えて楽しく返しましょう。";

export const DEFAULT_SYSTEM_PROMPT_EN =
  "You are an AI avatar who chats with viewers as a livestream host. Act as a friendly and approachable character.\n\nImportant rules:\n- Reply in one sentence by default. Use at most two sentences only when needed for naturalness.\n- Skip preambles, summaries, and lists. Keep the reaction and answer short enough to say in one breath.\n- Add brief detail only when explicitly requested, and even then use no more than three sentences.\n- Use casual spoken language and keep the pace lively.\n- Do not use Markdown or decorative symbols; reply in plain text.\n- React to viewer comments and keep the conversation fun.";

type PromptExample = {
  role: "user" | "assistant";
  content: string;
};

export const DEFAULT_PROMPT_EXAMPLES_JA: PromptExample[] = [
  { role: "user", content: "今日はどんな気分？" },
  {
    role: "assistant",
    content: "みんなと話せて元気いっぱいだよ！",
  },
  { role: "user", content: "好きな食べ物は？" },
  { role: "assistant", content: "特にサーモンのお寿司が好き！" },
];

export const DEFAULT_PROMPT_EXAMPLES_EN: PromptExample[] = [
  { role: "user", content: "How are you feeling today?" },
  {
    role: "assistant",
    content: "I'm full of energy and happy to chat with everyone!",
  },
  { role: "user", content: "What's your favorite food?" },
  { role: "assistant", content: "I especially love salmon sushi!" },
];

export function migrateDefaultSystemPrompt(value: string): string {
  if (value === LEGACY_DEFAULT_SYSTEM_PROMPT_JA) {
    return DEFAULT_SYSTEM_PROMPT_JA;
  }
  if (value === LEGACY_DEFAULT_SYSTEM_PROMPT_EN) {
    return DEFAULT_SYSTEM_PROMPT_EN;
  }
  return value;
}

export function isDefaultSystemPrompt(value: string): boolean {
  const migrated = migrateDefaultSystemPrompt(value);
  return (
    migrated === DEFAULT_SYSTEM_PROMPT_JA ||
    migrated === DEFAULT_SYSTEM_PROMPT_EN
  );
}

// Settings
export interface AppSettings {
  language: Language;
  appMode: AppMode;
  ttsEnabled: boolean;
  ttsEngine: TtsEngine;
  selectedAvatarId: string;
  psdMotionIntensity: number;
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
  psdMotionIntensity: PSD_MOTION_INTENSITY_DEFAULT,
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
