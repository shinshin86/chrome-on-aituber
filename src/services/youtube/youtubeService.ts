/**
 * YouTube Service — 将来のYouTubeライブチャット連携用スタブ
 *
 * YouTube Data API v3 を使ってライブチャットのコメントを取得する想定。
 * 現時点ではインターフェースの定義のみ。
 */

export interface YouTubeChatMessage {
  id: string;
  authorName: string;
  authorImageUrl: string;
  message: string;
  timestamp: number;
}

export interface YouTubeServiceConfig {
  apiKey: string;
  liveChatId: string;
  pollingIntervalMs: number;
}

// 将来実装用のプレースホルダー
export function createYouTubeService(_config: YouTubeServiceConfig) {
  return {
    start: () => {
      console.log("YouTube service: not yet implemented");
    },
    stop: () => {},
    onMessage: (_handler: (msg: YouTubeChatMessage) => void) => {},
  };
}
