/**
 * Twitch EventSub WebSocket でチャットを購読し、
 * pollInterval ごとにキュー先頭の 1 メッセージだけを callback に流す。
 */

export interface TwitchChatMessage {
  userName: string;
  userComment: string;
}

interface Options {
  channelLogin: string;
  pollInterval: number;
  onComment: (msg: TwitchChatMessage) => void;
  onTokenExpired?: () => void;
  token: string;
  clientId: string;
}

/* ── モジュール共通変数 ─────────────────────────────── */
let ws: WebSocket | null = null;
let buffer: Array<TwitchChatMessage> = [];
let pollTimer: number | null = null;
let currentSessionId: string | null = null;
let reconnectInProgress = false;
const processedMessageIds = new Set<string>();

export async function connectTwitchChat(opts: Options): Promise<WebSocket> {
  // 既に有効な接続があるかチェック
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  // 既存の接続があれば一旦切断
  if (ws) {
    disconnectTwitchChat();
  }

  const { channelLogin, pollInterval, onComment, onTokenExpired, token, clientId } = opts;

  /* 1) 既存のサブスクリプションをクリーンアップ */
  await cleanupExistingSubscriptions(token, clientId);

  /* 2) 配信者 ID を取得 */
  const br = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelLogin)}`,
    { headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId } },
  );
  if (br.status === 401) {
    onTokenExpired?.();
    throw new Error("Twitch token expired");
  }
  const broadcasterId = (await br.json()).data?.[0]?.id;
  if (!broadcasterId) throw new Error("Invalid channel login");

  /* 3) トークン本人のユーザー ID を取得 */
  const me = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (me.status === 401) {
    onTokenExpired?.();
    throw new Error("Twitch token expired");
  }
  const { user_id: userId } = await me.json();
  if (!userId) throw new Error("Token owner id not found");

  /* 4) WebSocket 接続 */
  ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
  attachHandlers();

  /* 5) pollInterval ごとに 1 件だけ UI へ渡す */
  pollTimer = window.setInterval(() => {
    if (buffer.length) {
      const message = buffer.shift()!;
      onComment(message);
    }
  }, pollInterval);

  return ws;

  /* ===== 内部関数 ===== */

  async function cleanupExistingSubscriptions(token: string, clientId: string) {
    try {
      const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Client-Id": clientId,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();
      const subscriptions = data.data || [];

      for (const subscription of subscriptions) {
        if (
          subscription.type === "channel.chat.message" &&
          subscription.transport?.method === "websocket"
        ) {
          await fetch(
            `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscription.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Client-Id": clientId,
              },
            },
          );
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup existing subscriptions:", error);
    }
  }

  function attachHandlers() {
    if (!ws) return;

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
      if (pollTimer) clearInterval(pollTimer);
      buffer = [];
      currentSessionId = null;

      if (!reconnectInProgress) {
        ws = null;
      }
    };

    ws.onerror = (error) => {
      console.error("Twitch WebSocket error:", error);
    };
  }

  async function subscribe(sessionId: string) {
    const response = await fetch(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": clientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: broadcasterId,
            user_id: userId,
          },
          transport: { method: "websocket", session_id: sessionId },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        onTokenExpired?.();
        throw new Error("Twitch token expired");
      }
      const errorData = await response.json();
      throw new Error(`Subscription failed: ${JSON.stringify(errorData)}`);
    }

    currentSessionId = sessionId;
  }

  function reconnect(url: string) {
    reconnectInProgress = true;
    const oldWs = ws;
    ws = new WebSocket(url);
    attachHandlers();

    ws!.onopen = () => {
      reconnectInProgress = false;
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close();
      }
    };
  }

  async function handleWsMessage(ev: MessageEvent) {
    try {
      const msg = JSON.parse(ev.data);
      const type = msg.metadata?.message_type;

      if (type === "session_welcome") {
        await subscribe(msg.payload.session.id);
        return;
      }

      if (type === "session_reconnect") {
        reconnect(msg.payload.session.reconnect_url);
        return;
      }

      if (type === "session_keepalive" || type === "revocation") {
        return;
      }

      if (
        type === "notification" &&
        msg.payload.subscription.type === "channel.chat.message"
      ) {
        const messageId = msg.payload.event.message_id;
        if (processedMessageIds.has(messageId)) return;

        processedMessageIds.add(messageId);
        buffer.push({
          userName: msg.payload.event.chatter_user_name,
          userComment: msg.payload.event.message.text,
        });
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }
}

export function disconnectTwitchChat() {
  if (ws) {
    ws.close();
    ws = null;
  }

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  buffer = [];
  currentSessionId = null;
  reconnectInProgress = false;
  processedMessageIds.clear();
}
