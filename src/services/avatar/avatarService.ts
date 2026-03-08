import type { AvatarPack, AvatarImages } from "../../types";
import {
  listAvatarPacks,
  saveAvatarPack,
  deleteAvatarPack,
  type StoredAvatarPack,
} from "../storage/storageService";

const DEFAULT_AVATAR: AvatarPack = {
  id: "default",
  name: "Default",
  isBuiltIn: true,
  images: {
    mouthCloseEyesOpen: "/assets/avatars/default/mouth_close_eyes_open.png",
    mouthCloseEyesClose: "/assets/avatars/default/mouth_close_eyes_close.png",
    mouthOpenEyesOpen: "/assets/avatars/default/mouth_open_eyes_open.png",
    mouthOpenEyesClose: "/assets/avatars/default/mouth_open_eyes_close.png",
  },
};

export function getDefaultAvatar(): AvatarPack {
  return DEFAULT_AVATAR;
}

export async function getAllAvatars(): Promise<AvatarPack[]> {
  const stored = await listAvatarPacks();
  const custom: AvatarPack[] = stored.map(storedToAvatarPack);
  return [DEFAULT_AVATAR, ...custom];
}

export async function registerAvatar(
  name: string,
  files: {
    mouthCloseEyesOpen: File;
    mouthCloseEyesClose: File;
    mouthOpenEyesOpen: File;
    mouthOpenEyesClose: File;
  }
): Promise<AvatarPack> {
  const id = `custom_${Date.now()}`;
  const stored: StoredAvatarPack = {
    id,
    name,
    images: {
      mouthCloseEyesOpen: files.mouthCloseEyesOpen,
      mouthCloseEyesClose: files.mouthCloseEyesClose,
      mouthOpenEyesOpen: files.mouthOpenEyesOpen,
      mouthOpenEyesClose: files.mouthOpenEyesClose,
    },
  };
  await saveAvatarPack(stored);
  return storedToAvatarPack(stored);
}

export async function removeAvatar(id: string): Promise<void> {
  if (id === "default") return;
  await deleteAvatarPack(id);
}

/** Track blob URLs so they can be revoked to avoid memory leaks */
const activeBlobUrls = new Set<string>();

function storedToAvatarPack(stored: StoredAvatarPack): AvatarPack {
  const toUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    activeBlobUrls.add(url);
    return url;
  };
  return {
    id: stored.id,
    name: stored.name,
    isBuiltIn: false,
    images: {
      mouthCloseEyesOpen: toUrl(stored.images.mouthCloseEyesOpen),
      mouthCloseEyesClose: toUrl(stored.images.mouthCloseEyesClose),
      mouthOpenEyesOpen: toUrl(stored.images.mouthOpenEyesOpen),
      mouthOpenEyesClose: toUrl(stored.images.mouthOpenEyesClose),
    },
  };
}

/** Revoke all active blob URLs created by storedToAvatarPack */
export function revokeAvatarUrls(): void {
  for (const url of activeBlobUrls) {
    URL.revokeObjectURL(url);
  }
  activeBlobUrls.clear();
}

export function getSpriteUrl(
  images: AvatarImages,
  mouthOpen: boolean,
  eyesOpen: boolean
): string {
  if (mouthOpen && eyesOpen) return images.mouthOpenEyesOpen;
  if (mouthOpen && !eyesOpen) return images.mouthOpenEyesClose;
  if (!mouthOpen && eyesOpen) return images.mouthCloseEyesOpen;
  return images.mouthCloseEyesClose;
}
