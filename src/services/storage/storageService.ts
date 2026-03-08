import type { AppSettings, ChatMessage } from "../../types";
import { DEFAULT_SETTINGS } from "../../types";

const KEYS = {
  SETTINGS: "aituber_settings",
  MESSAGES: "aituber_messages",
} as const;

const DB_NAME = "aituber_db";
const DB_VERSION = 1;
const AVATAR_STORE = "avatars";

// --- LocalStorage (settings / messages) ---

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEYS.MESSAGES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMessages(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-100);
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(trimmed));
}

// --- IndexedDB (avatar blobs) ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AVATAR_STORE)) {
        db.createObjectStore(AVATAR_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredAvatarPack {
  id: string;
  name: string;
  images: {
    mouthCloseEyesOpen: Blob;
    mouthCloseEyesClose: Blob;
    mouthOpenEyesOpen: Blob;
    mouthOpenEyesClose: Blob;
  };
}

export async function saveAvatarPack(pack: StoredAvatarPack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AVATAR_STORE, "readwrite");
    tx.objectStore(AVATAR_STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAvatarPack(
  id: string
): Promise<StoredAvatarPack | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AVATAR_STORE, "readonly");
    const req = tx.objectStore(AVATAR_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function listAvatarPacks(): Promise<StoredAvatarPack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AVATAR_STORE, "readonly");
    const req = tx.objectStore(AVATAR_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAvatarPack(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AVATAR_STORE, "readwrite");
    tx.objectStore(AVATAR_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
