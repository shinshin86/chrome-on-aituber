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
const liveSockets = new Set<WebSocket>();
let buffer: Array<TwitchChatMessage> = [];
let pollTimer: number | null = null;
let connectionGeneration = 0;
let connectionAbortController: AbortController | null = null;
const processedMessageIds = new Set<string>();

export async function connectTwitchChat(opts: Options): Promise<WebSocket> {
  // 既に有効な接続があるかチェック
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  // Cancel any in-flight connection attempt and non-open sockets.
  disconnectTwitchChat();

  const generation = connectionGeneration;
  const abortController = new AbortController();
  const { signal } = abortController;
  connectionAbortController = abortController;

  const { channelLogin, pollInterval, onComment, onTokenExpired, token, clientId } = opts;

  /* 1) 既存のサブスクリプションをクリーンアップ */
  await cleanupExistingSubscriptions(token, clientId);
  assertCurrentConnection();

  /* 2) 配信者 ID を取得 */
  const br = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelLogin)}`,
    {
      headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId },
      signal,
    },
  );
  assertCurrentConnection();
  if (br.status === 401) {
    onTokenExpired?.();
    throw new Error("Twitch token expired");
  }
  const broadcasterData = await br.json();
  assertCurrentConnection();
  const broadcasterId = broadcasterData.data?.[0]?.id;
  if (!broadcasterId) throw new Error("Invalid channel login");

  /* 3) トークン本人のユーザー ID を取得 */
  const me = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token}` },
    signal,
  });
  assertCurrentConnection();
  if (me.status === 401) {
    onTokenExpired?.();
    throw new Error("Twitch token expired");
  }
  const validationData = await me.json();
  assertCurrentConnection();
  const { user_id: userId } = validationData;
  if (!userId) throw new Error("Token owner id not found");

  /* 4) WebSocket 接続 */
  const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
  liveSockets.add(socket);
  ws = socket;
  attachHandlers(socket);

  /* 5) pollInterval ごとに 1 件だけ UI へ渡す */
  pollTimer = window.setInterval(() => {
    if (buffer.length) {
      const message = buffer.shift()!;
      onComment(message);
    }
  }, pollInterval);

  return socket;

  /* ===== 内部関数 ===== */

  function isCurrentConnection(): boolean {
    return (
      connectionGeneration === generation &&
      connectionAbortController === abortController &&
      !signal.aborted
    );
  }

  function isCurrentSocket(socket: WebSocket): boolean {
    return isCurrentConnection() && ws === socket;
  }

  function assertCurrentConnection(): void {
    if (!isCurrentConnection()) {
      throw new DOMException("Twitch connection cancelled", "AbortError");
    }
  }

  async function cleanupExistingSubscriptions(token: string, clientId: string) {
    try {
      const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Client-Id": clientId,
          },
          signal,
        },
      );
      assertCurrentConnection();

      if (!response.ok) return;

      const data = await response.json();
      assertCurrentConnection();
      const subscriptions = data.data || [];

      for (const subscription of subscriptions) {
        assertCurrentConnection();
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
              signal,
            },
          );
          assertCurrentConnection();
        }
      }
    } catch (error) {
      if (!isCurrentConnection()) throw error;
      console.warn("Failed to cleanup existing subscriptions:", error);
    }
  }

  function attachHandlers(socket: WebSocket) {
    socket.onmessage = (event) => {
      void handleWsMessage(event, socket);
    };

    socket.onclose = () => {
      liveSockets.delete(socket);
      if (!isCurrentSocket(socket)) return;

      for (const otherSocket of liveSockets) {
        closeSocket(otherSocket);
      }

      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      buffer = [];
      ws = null;
      if (connectionAbortController === abortController) {
        abortController.abort();
        connectionAbortController = null;
      }
    };

    socket.onerror = (error) => {
      if (!isCurrentSocket(socket)) return;
      console.error("Twitch WebSocket error:", error);
    };
  }

  async function subscribe(sessionId: string, socket: WebSocket) {
    if (!isCurrentSocket(socket)) return;

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
        signal,
      },
    );

    if (!isCurrentSocket(socket)) return;

    if (!response.ok) {
      if (response.status === 401) {
        onTokenExpired?.();
        throw new Error("Twitch token expired");
      }
      const errorData = await response.json();
      throw new Error(`Subscription failed: ${JSON.stringify(errorData)}`);
    }
  }

  function reconnect(url: string, socket: WebSocket) {
    if (!isCurrentSocket(socket)) return;

    const oldSocket = socket;
    const newSocket = new WebSocket(url);
    liveSockets.add(newSocket);
    ws = newSocket;
    attachHandlers(newSocket);

    newSocket.onopen = () => {
      if (!isCurrentSocket(newSocket)) {
        closeSocket(newSocket);
        return;
      }
      closeSocket(oldSocket);
    };
  }

  async function handleWsMessage(ev: MessageEvent, socket: WebSocket) {
    if (!isCurrentSocket(socket)) return;

    try {
      const msg = JSON.parse(ev.data);
      const type = msg.metadata?.message_type;

      if (type === "session_welcome") {
        await subscribe(msg.payload.session.id, socket);
        return;
      }

      if (type === "session_reconnect") {
        reconnect(msg.payload.session.reconnect_url, socket);
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
      if (!isCurrentConnection()) return;
      console.error("Error handling WebSocket message:", error);
    }
  }
}

export function disconnectTwitchChat() {
  connectionGeneration += 1;
  connectionAbortController?.abort();
  connectionAbortController = null;

  for (const socket of liveSockets) {
    closeSocket(socket);
  }
  liveSockets.clear();
  ws = null;

  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  buffer = [];
  processedMessageIds.clear();
}

function closeSocket(socket: WebSocket): void {
  socket.onopen = null;
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
  liveSockets.delete(socket);

  if (
    socket.readyState === WebSocket.CONNECTING ||
    socket.readyState === WebSocket.OPEN
  ) {
    socket.close();
  }
}
