import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteAvatarViewTransform,
  loadAvatarViewTransform,
  saveAvatarViewTransform,
} from "../services/storage/storageService";
import type { AvatarViewTransform } from "../types";

export const DEFAULT_AVATAR_VIEW_TRANSFORM: AvatarViewTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

interface Options {
  defaultTransform?: AvatarViewTransform;
  minScale?: number;
  maxScale?: number;
}

const PERSIST_DELAY_MS = 100;

function sanitizeTransform(
  transform: AvatarViewTransform,
  minScale: number,
  maxScale: number
): AvatarViewTransform {
  return {
    x: Number.isFinite(transform.x) ? transform.x : 0,
    y: Number.isFinite(transform.y) ? transform.y : 0,
    scale: Math.min(
      maxScale,
      Math.max(minScale, Number.isFinite(transform.scale) ? transform.scale : 1)
    ),
  };
}

export function useAvatarViewTransform(
  avatarId: string,
  options: Options = {}
) {
  const minScale = options.minScale ?? 0.25;
  const maxScale = options.maxScale ?? 4;
  const defaultTransform =
    options.defaultTransform ?? DEFAULT_AVATAR_VIEW_TRANSFORM;
  const sanitizedDefaultTransform = useMemo(
    () => sanitizeTransform(defaultTransform, minScale, maxScale),
    [defaultTransform, maxScale, minScale]
  );

  const storedTransform = loadAvatarViewTransform(avatarId);
  const [hasPersistedTransform, setHasPersistedTransform] = useState(
    storedTransform !== undefined
  );
  const [transform, setTransformState] = useState<AvatarViewTransform>(() =>
    sanitizeTransform(
      storedTransform ?? sanitizedDefaultTransform,
      minScale,
      maxScale
    )
  );
  const transformRef = useRef(transform);
  const persistTimerRef = useRef<number | null>(null);

  const flushPersistedTransform = useCallback(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    saveAvatarViewTransform(avatarId, transformRef.current);
  }, [avatarId]);

  const setTransform = useCallback(
    (nextTransform: AvatarViewTransform) => {
      const sanitized = sanitizeTransform(nextTransform, minScale, maxScale);
      transformRef.current = sanitized;
      setTransformState(sanitized);
      setHasPersistedTransform(true);
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = window.setTimeout(
        flushPersistedTransform,
        PERSIST_DELAY_MS
      );
      return sanitized;
    },
    [flushPersistedTransform, maxScale, minScale]
  );

  const resetTransform = useCallback(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const nextTransform = sanitizedDefaultTransform;
    transformRef.current = nextTransform;
    setTransformState(nextTransform);
    setHasPersistedTransform(false);
    deleteAvatarViewTransform(avatarId);
    return nextTransform;
  }, [avatarId, sanitizedDefaultTransform]);

  useEffect(
    () => () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        saveAvatarViewTransform(avatarId, transformRef.current);
      }
    },
    [avatarId]
  );

  return {
    transform,
    transformRef,
    hasPersistedTransform,
    setTransform,
    resetTransform,
    flushPersistedTransform,
  };
}
