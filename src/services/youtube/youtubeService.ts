/**
 * YouTube Live Chat Service
 *
 * YouTube Data API v3 を使ってライブチャットのコメントを取得する。
 * reference/aituber-studio の実装を参考に、重複排除・時間制限・メモリ管理を実装。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface YouTubeChatMessage {
  id: string;
  userName: string;
  userIconUrl: string;
  userComment: string;
  publishedAt: string;
}

// ライブ配信ごとの内部状態
interface LiveChatState {
  nextPageToken: string;
  processedCommentIds: Set<string>;
  processedCommentHashes: Set<string>;
  lastProcessedComment: { hash: string; timestamp: number } | null;
  lastFetchTime: number;
  lastCleanupTime: number;
}

const DEFAULT_TIME_LIMIT_MINUTES = 10;
const MAX_COMMENT_IDS = 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

const liveChatStates = new Map<string, LiveChatState>();
const pollingIntervals = new Map<string, number>();

function getLiveChatState(liveId: string): LiveChatState {
  if (!liveChatStates.has(liveId)) {
    liveChatStates.set(liveId, {
      nextPageToken: "",
      processedCommentIds: new Set(),
      processedCommentHashes: new Set(),
      lastProcessedComment: null,
      lastFetchTime: 0,
      lastCleanupTime: 0,
    });
  }
  return liveChatStates.get(liveId)!;
}

function generateCommentHash(content: string, userName: string): string {
  return `${userName}:${content}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function isWithinTimeLimit(
  publishedAt: string,
  timeLimitMinutes: number
): boolean {
  const commentTime = new Date(publishedAt).getTime();
  return Date.now() - commentTime < timeLimitMinutes * 60 * 1000;
}

function cleanupOldStates(): void {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [liveId, state] of liveChatStates.entries()) {
    if (now - state.lastFetchTime > ONE_HOUR) {
      liveChatStates.delete(liveId);
    }
  }
}

function cleanupOldCommentIds(state: LiveChatState): void {
  const now = Date.now();
  if (now - state.lastCleanupTime < CLEANUP_INTERVAL) return;
  if (state.processedCommentIds.size > MAX_COMMENT_IDS) {
    state.processedCommentIds.clear();
    state.processedCommentHashes.clear();
  }
  state.lastCleanupTime = now;
}

export async function getLiveChatId(
  liveId: string,
  apiKey: string
): Promise<string> {
  const params = new URLSearchParams({
    part: "liveStreamingDetails",
    id: liveId,
    key: apiKey,
  });
  const response = await fetch(
    `https://youtube.googleapis.com/youtube/v3/videos?${params}`
  );
  const json = await response.json();
  if (!json.items || json.items.length === 0) return "";
  return json.items[0].liveStreamingDetails?.activeLiveChatId || "";
}

export async function retrieveLiveComments(
  liveId: string,
  activeLiveChatId: string,
  apiKey: string,
  onComment: (comment: YouTubeChatMessage) => void,
  timeLimitMinutes: number = DEFAULT_TIME_LIMIT_MINUTES
): Promise<void> {
  const state = getLiveChatState(liveId);

  const params = new URLSearchParams({
    liveChatId: activeLiveChatId,
    part: "authorDetails,snippet",
    key: apiKey,
  });
  if (state.nextPageToken) {
    params.set("pageToken", state.nextPageToken);
  }

  const response = await fetch(
    `https://youtube.googleapis.com/youtube/v3/liveChat/messages?${params}`
  );
  const json = await response.json();

  if (json.error) {
    console.error("YouTube API Error:", json.error);
    return;
  }

  if (json.pollingIntervalMillis) {
    pollingIntervals.set(liveId, json.pollingIntervalMillis);
  }

  const items: any[] = json.items || [];
  state.nextPageToken = json.nextPageToken || "";
  state.lastFetchTime = Date.now();

  const newComments: YouTubeChatMessage[] = items
    .filter((item: any) => {
      const commentId = item.id;
      const publishedAt = item.snippet.publishedAt;
      const userName = item.authorDetails.displayName;
      const userComment =
        item.snippet.textMessageDetails?.messageText ||
        item.snippet.superChatDetails?.userComment ||
        "";

      const commentHash = generateCommentHash(userComment, userName);

      if (state.processedCommentIds.has(commentId)) return false;
      if (!isWithinTimeLimit(publishedAt, timeLimitMinutes)) return false;

      if (state.processedCommentHashes.has(commentHash)) {
        state.processedCommentIds.add(commentId);
        return false;
      }

      if (
        state.lastProcessedComment &&
        state.lastProcessedComment.hash === commentHash &&
        Date.now() - state.lastProcessedComment.timestamp < 3000
      ) {
        state.processedCommentIds.add(commentId);
        return false;
      }

      state.processedCommentIds.add(commentId);
      state.processedCommentHashes.add(commentHash);
      return true;
    })
    .map((item: any) => ({
      id: item.id,
      userName: item.authorDetails.displayName,
      userIconUrl: item.authorDetails.profileImageUrl,
      userComment:
        item.snippet.textMessageDetails?.messageText ||
        item.snippet.superChatDetails?.userComment ||
        "",
      publishedAt: item.snippet.publishedAt,
    }))
    .filter((c) => c.userComment !== "");

  if (newComments.length > 0) {
    const selected =
      newComments[Math.floor(Math.random() * newComments.length)];
    const hash = generateCommentHash(selected.userComment, selected.userName);
    state.lastProcessedComment = { hash, timestamp: Date.now() };
    onComment(selected);
  }

  cleanupOldCommentIds(state);
  if (Math.random() < 0.1) cleanupOldStates();
}

export async function fetchAndProcessComments(
  liveId: string,
  apiKey: string,
  onComment: (comment: YouTubeChatMessage) => void,
  timeLimitMinutes: number = DEFAULT_TIME_LIMIT_MINUTES
): Promise<void> {
  if (!apiKey || !liveId) return;
  try {
    const liveChatId = await getLiveChatId(liveId, apiKey);
    if (liveChatId) {
      await retrieveLiveComments(
        liveId,
        liveChatId,
        apiKey,
        onComment,
        timeLimitMinutes
      );
    }
  } catch (error) {
    console.error("Error fetching YouTube comments:", error);
  }
}

export function getNextPollingInterval(
  liveId: string,
  userIntervalMs: number
): number {
  const apiRecommended = pollingIntervals.get(liveId) || 0;
  return Math.max(userIntervalMs, apiRecommended);
}
