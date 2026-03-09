import { useCallback } from "react";
import {
  fetchAndProcessComments,
  getNextPollingInterval,
  type YouTubeChatMessage,
} from "../services/youtube/youtubeService";
import { useInterval } from "./useInterval";

interface Params {
  youtubeLiveId: string;
  youtubeApiKey: string;
  isEnabled: boolean;
  intervalMs?: number;
  timeLimitMinutes?: number;
  onComment: (comment: YouTubeChatMessage) => void;
}

/**
 * YouTube Live のチャットを定期取得して onComment に流すカスタムフック。
 *
 * - isEnabled && liveId && apiKey が揃った場合のみタイマー起動
 * - API 推奨の pollingIntervalMillis を考慮した安全な間隔で取得
 */
export function useYoutubeComments({
  youtubeLiveId,
  youtubeApiKey,
  isEnabled,
  intervalMs = 20_000,
  timeLimitMinutes = 10,
  onComment,
}: Params): void {
  const fetchComments = useCallback(async () => {
    if (!isEnabled || !youtubeLiveId || !youtubeApiKey) return;
    await fetchAndProcessComments(
      youtubeLiveId,
      youtubeApiKey,
      onComment,
      timeLimitMinutes
    );
  }, [isEnabled, youtubeLiveId, youtubeApiKey, onComment, timeLimitMinutes]);

  const safeIntervalMs = getNextPollingInterval(youtubeLiveId, intervalMs);

  useInterval(
    fetchComments,
    isEnabled && youtubeLiveId && youtubeApiKey ? safeIntervalMs : null
  );
}
