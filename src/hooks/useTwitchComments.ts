import { useEffect, useEffectEvent } from "react";
import {
  connectTwitchChat,
  disconnectTwitchChat,
  type TwitchChatMessage,
} from "../services/twitch/twitchService";

interface Params {
  twitchChannel: string;
  twitchClientId: string;
  twitchAccessToken: string;
  isEnabled: boolean;
  intervalMs: number;
  onComment: (comment: TwitchChatMessage) => void;
  onTokenExpired?: () => void;
}

/**
 * Twitch EventSub WebSocket でチャットを取得するカスタムフック。
 *
 * - isEnabled && channel && clientId && accessToken が揃った場合のみ接続
 * - WebSocket push + バッファ dequeue 方式
 */
export function useTwitchComments({
  twitchChannel,
  twitchClientId,
  twitchAccessToken,
  isEnabled,
  intervalMs,
  onComment,
  onTokenExpired,
}: Params): void {
  const onCommentEvent = useEffectEvent((msg: TwitchChatMessage) => {
    onComment(msg);
  });
  const onTokenExpiredEvent = useEffectEvent(() => {
    onTokenExpired?.();
  });

  useEffect(() => {
    if (
      !isEnabled ||
      !twitchChannel ||
      !twitchClientId ||
      !twitchAccessToken
    ) {
      return;
    }

    let cancelled = false;

    connectTwitchChat({
      channelLogin: twitchChannel,
      pollInterval: intervalMs,
      onComment: (msg) => {
        if (!cancelled) onCommentEvent(msg);
      },
      onTokenExpired: () => {
        if (!cancelled) onTokenExpiredEvent();
      },
      token: twitchAccessToken,
      clientId: twitchClientId,
    }).catch((err) => {
      if (!cancelled) {
        console.error("Twitch connection failed:", err);
      }
    });

    return () => {
      cancelled = true;
      disconnectTwitchChat();
    };
  }, [isEnabled, twitchChannel, twitchClientId, twitchAccessToken, intervalMs]);
}
