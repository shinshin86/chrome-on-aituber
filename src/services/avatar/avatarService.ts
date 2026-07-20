import type {
  AvatarKind,
  AvatarPack,
  AvatarImages,
  PetManifest,
} from "../../types";
import {
  loadAvatarPack,
  listAvatarPacks,
  saveAvatarPack,
  deleteAvatarPack,
  type StoredAvatarPack,
} from "../storage/storageService";

const BASE_URL = import.meta.env.BASE_URL;

const DEFAULT_AVATAR: Extract<AvatarPack, { kind: "png" }> = {
  id: "default",
  name: "Miko",
  kind: "png",
  isBuiltIn: true,
  thumbnailUrl: `${BASE_URL}assets/avatars/default/mouth_close_eyes_open.png`,
  images: {
    mouthCloseEyesOpen: `${BASE_URL}assets/avatars/default/mouth_close_eyes_open.png`,
    mouthCloseEyesClose: `${BASE_URL}assets/avatars/default/mouth_close_eyes_close.png`,
    mouthOpenEyesOpen: `${BASE_URL}assets/avatars/default/mouth_open_eyes_open.png`,
    mouthOpenEyesClose: `${BASE_URL}assets/avatars/default/mouth_open_eyes_close.png`,
  },
};

const BUILT_IN_AVATARS: AvatarPack[] = [
  DEFAULT_AVATAR,
  {
    id: "builtin_purupuru",
    name: "Miko PuruPuru",
    kind: "purupuru",
    isBuiltIn: true,
    packageUrl: `${BASE_URL}assets/avatars/purupuru/miko.purupuru`,
  },
  {
    id: "builtin_pet",
    name: "Miko Pet",
    kind: "pet",
    isBuiltIn: true,
    manifest: {
      id: "miko",
      displayName: "Miko",
      description: "A tiny animated Miko companion.",
      spritesheetPath: "spritesheet.webp",
    },
    spritesheetUrl: `${BASE_URL}assets/avatars/pet/spritesheet.webp`,
  },
  {
    id: "builtin_vrm",
    name: "Miko VRM",
    kind: "vrm",
    isBuiltIn: true,
    modelUrl: `${BASE_URL}assets/avatars/vrm/miko.vrm`,
    animationUrl: `${BASE_URL}assets/avatars/vrm/idle_loop.vrma`,
  },
  {
    id: "builtin_psd",
    name: "PSD Sample",
    kind: "psd",
    isBuiltIn: true,
    modelUrl: `${BASE_URL}assets/avatars/psd/sample.psd`,
  },
  {
    id: "builtin_inochi2d",
    name: "Aka Inochi2D",
    kind: "inochi2d",
    isBuiltIn: true,
    manifestModelId: "aka",
  },
];

const BUILT_IN_IDS = new Set(BUILT_IN_AVATARS.map((avatar) => avatar.id));
const activeBlobUrls = new Set<string>();

export function getDefaultAvatar(): Extract<AvatarPack, { kind: "png" }> {
  return DEFAULT_AVATAR;
}

export function getBuiltInAvatars(): AvatarPack[] {
  return BUILT_IN_AVATARS;
}

export async function getAllAvatars(): Promise<AvatarPack[]> {
  const stored = await listAvatarPacks();
  const custom = stored
    .map(storedToAvatarPack)
    .filter((avatar): avatar is AvatarPack => avatar !== undefined);
  return [...BUILT_IN_AVATARS, ...custom];
}

export async function getAvatarById(id: string): Promise<AvatarPack | undefined> {
  const builtIn = BUILT_IN_AVATARS.find((avatar) => avatar.id === id);
  if (builtIn) return builtIn;
  const stored = await loadAvatarPack(id);
  return stored ? storedToAvatarPack(stored) : undefined;
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
  const stored: StoredAvatarPack = {
    id: createCustomId("png"),
    name,
    kind: "png",
    images: files,
  };
  await saveAvatarPack(stored);
  return storedToAvatarPack(stored)!;
}

export async function registerFileAvatar(
  kind: Exclude<AvatarKind, "png" | "pet">,
  name: string,
  asset: File,
  secondaryAsset?: File
): Promise<AvatarPack> {
  const stored: StoredAvatarPack = {
    id: createCustomId(kind),
    name,
    kind,
    asset,
    secondaryAsset,
  };
  await saveAvatarPack(stored);
  return storedToAvatarPack(stored)!;
}

export async function registerPetAvatar(
  name: string,
  manifest: PetManifest,
  spritesheet: File
): Promise<AvatarPack> {
  const stored: StoredAvatarPack = {
    id: createCustomId("pet"),
    name,
    kind: "pet",
    manifest,
    asset: spritesheet,
  };
  await saveAvatarPack(stored);
  return storedToAvatarPack(stored)!;
}

export async function removeAvatar(id: string): Promise<void> {
  if (BUILT_IN_IDS.has(id)) return;
  await deleteAvatarPack(id);
}

function createCustomId(kind: AvatarKind): string {
  return `custom_${kind}_${Date.now()}`;
}

function createBlobUrl(blob: Blob, urls: string[]): string {
  const url = URL.createObjectURL(blob);
  activeBlobUrls.add(url);
  urls.push(url);
  return url;
}

function createDispose(urls: string[]): () => void {
  return () => {
    for (const url of urls) {
      URL.revokeObjectURL(url);
      activeBlobUrls.delete(url);
    }
  };
}

function storedToAvatarPack(stored: StoredAvatarPack): AvatarPack | undefined {
  const kind = stored.kind ?? "png";
  const urls: string[] = [];
  const base = {
    id: stored.id,
    name: stored.name,
    kind,
    isBuiltIn: false,
    dispose: createDispose(urls),
  } as const;

  if (kind === "png" && stored.images) {
    const images: AvatarImages = {
      mouthCloseEyesOpen: createBlobUrl(stored.images.mouthCloseEyesOpen, urls),
      mouthCloseEyesClose: createBlobUrl(stored.images.mouthCloseEyesClose, urls),
      mouthOpenEyesOpen: createBlobUrl(stored.images.mouthOpenEyesOpen, urls),
      mouthOpenEyesClose: createBlobUrl(stored.images.mouthOpenEyesClose, urls),
    };
    return {
      ...base,
      kind,
      images,
      thumbnailUrl: images.mouthCloseEyesOpen,
    };
  }

  if (!stored.asset) return undefined;
  const assetUrl = createBlobUrl(stored.asset, urls);

  if (kind === "purupuru") {
    return { ...base, kind, packageUrl: assetUrl };
  }
  if (kind === "psd") {
    return { ...base, kind, modelUrl: assetUrl };
  }
  if (kind === "inochi2d") {
    return {
      ...base,
      kind,
      modelUrl: assetUrl,
      motionUrl: stored.secondaryAsset
        ? createBlobUrl(stored.secondaryAsset, urls)
        : undefined,
    };
  }
  if (kind === "vrm") {
    return {
      ...base,
      kind,
      modelUrl: assetUrl,
      animationUrl: stored.secondaryAsset
        ? createBlobUrl(stored.secondaryAsset, urls)
        : undefined,
    };
  }
  if (kind === "pet") {
    return {
      ...base,
      kind,
      manifest: stored.manifest ?? { displayName: stored.name },
      spritesheetUrl: assetUrl,
    };
  }

  return undefined;
}

export function revokeAvatarUrls(): void {
  for (const url of activeBlobUrls) URL.revokeObjectURL(url);
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
