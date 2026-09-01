import type {
  AppSettings,
  AvatarKind,
  AvatarViewTransform,
  ChatMessage,
  PetManifest,
  VrmViewTransform,
} from "../../types";
import {
  DEFAULT_SETTINGS,
  migrateDefaultSystemPrompt,
  normalizePsdMotionIntensity,
} from "../../types";

const PREFIX = "chrome-on-aituber";

const KEYS = {
  SETTINGS: `${PREFIX}_settings`,
  MESSAGES: `${PREFIX}_messages`,
  AVATAR_VIEWS: `${PREFIX}_avatar_views`,
} as const;

const DB_NAME = `${PREFIX}_db`;
const DB_VERSION = 2;
const AVATAR_STORE = "avatars";
const BACKGROUND_STORE = "backgrounds";
const BACKGROUND_ID = "screen-background";

// --- LocalStorage (settings / messages) ---

function saveToLocalStorage(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error("Value could not be serialized");
    }
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`Failed to save localStorage item "${key}":`, error);
    return false;
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const settings = {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    } as AppSettings;
    settings.llmSystemPrompt = migrateDefaultSystemPrompt(
      settings.llmSystemPrompt
    );
    settings.psdMotionIntensity = normalizePsdMotionIntensity(
      settings.psdMotionIntensity
    );
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): boolean {
  return saveToLocalStorage(KEYS.SETTINGS, settings);
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

export function saveMessages(messages: ChatMessage[]): boolean {
  const trimmed = messages.slice(-100);
  return saveToLocalStorage(KEYS.MESSAGES, trimmed);
}

type StoredAvatarView =
  | ({ kind: "2d" } & AvatarViewTransform)
  | ({ kind: "vrm" } & VrmViewTransform);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isVector3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(isFiniteNumber)
  );
}

function loadAvatarViews(): Record<string, StoredAvatarView> {
  try {
    const raw = localStorage.getItem(KEYS.AVATAR_VIEWS);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, StoredAvatarView>)
      : {};
  } catch {
    return {};
  }
}

function saveAvatarView(id: string, view: StoredAvatarView): boolean {
  const views = loadAvatarViews();
  views[id] = view;
  return saveToLocalStorage(KEYS.AVATAR_VIEWS, views);
}

export function loadAvatarViewTransform(
  id: string
): AvatarViewTransform | undefined {
  const view = loadAvatarViews()[id];
  if (
    view?.kind !== "2d" ||
    !isFiniteNumber(view.x) ||
    !isFiniteNumber(view.y) ||
    !isFiniteNumber(view.scale)
  ) {
    return undefined;
  }
  return { x: view.x, y: view.y, scale: view.scale };
}

export function saveAvatarViewTransform(
  id: string,
  transform: AvatarViewTransform
): boolean {
  return saveAvatarView(id, { kind: "2d", ...transform });
}

export function loadVrmViewTransform(id: string): VrmViewTransform | undefined {
  const view = loadAvatarViews()[id];
  if (
    view?.kind !== "vrm" ||
    !isVector3(view.cameraPosition) ||
    !isVector3(view.target)
  ) {
    return undefined;
  }
  return {
    cameraPosition: [...view.cameraPosition],
    target: [...view.target],
  };
}

export function saveVrmViewTransform(
  id: string,
  transform: VrmViewTransform
): boolean {
  return saveAvatarView(id, { kind: "vrm", ...transform });
}

export function deleteAvatarViewTransform(id: string): boolean {
  const views = loadAvatarViews();
  if (!(id in views)) return true;
  delete views[id];
  return saveToLocalStorage(KEYS.AVATAR_VIEWS, views);
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
      if (!db.objectStoreNames.contains(BACKGROUND_STORE)) {
        db.createObjectStore(BACKGROUND_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredAvatarPack {
  id: string;
  name: string;
  /** Missing on records created before multi-format avatar support. */
  kind?: AvatarKind;
  images?: {
    mouthCloseEyesOpen: Blob;
    mouthCloseEyesClose: Blob;
    mouthOpenEyesOpen: Blob;
    mouthOpenEyesClose: Blob;
  };
  asset?: Blob;
  secondaryAsset?: Blob;
  manifest?: PetManifest;
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

export interface StoredBackgroundImage {
  id: string;
  name: string;
  image: Blob;
}

export async function saveBackgroundImage(file: Blob, name: string): Promise<void> {
  const db = await openDB();
  const payload: StoredBackgroundImage = {
    id: BACKGROUND_ID,
    name,
    image: file,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, "readwrite");
    tx.objectStore(BACKGROUND_STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBackgroundImage(): Promise<StoredBackgroundImage | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, "readonly");
    const req = tx.objectStore(BACKGROUND_STORE).get(BACKGROUND_ID);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBackgroundImage(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, "readwrite");
    tx.objectStore(BACKGROUND_STORE).delete(BACKGROUND_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
