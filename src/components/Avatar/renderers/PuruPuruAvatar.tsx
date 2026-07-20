import { useCallback, useEffect, useRef, useState } from "react";
import { loadPuruPuruPackage } from "../../../avatar-runtime/purupuru/lib/purupuruPackage";
import { createPuruPuruRenderer } from "../../../avatar-runtime/purupuru/lib/purupuruRenderer";
import type { PuruPuruAvatarPackage } from "../../../avatar-runtime/purupuru/lib/purupuruPackage";
import { useAvatarViewTransform } from "../../../hooks/useAvatarViewTransform";
import type { AvatarViewTransform } from "../../../types";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  packageUrl: string;
  mouthLevel: number;
  isSpeaking: boolean;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: AvatarViewTransform;
}

const DEFAULT_EFFECT_ANCHOR = {
  faceX: 0.5,
  faceY: 0.4,
  leftEyeX: 0.43,
  leftEyeY: 0.34,
  rightEyeX: 0.57,
  rightEyeY: 0.34,
  effectScale: 1,
};

export function PuruPuruAvatar({ avatarId, packageUrl, mouthLevel, isSpeaking }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const packageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const mouthLevelRef = useRef(mouthLevel);
  const speakingRef = useRef(isSpeaking);
  const dragRef = useRef<DragState | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const {
    transform,
    transformRef,
    setTransform,
    resetTransform,
    flushPersistedTransform,
  } = useAvatarViewTransform(avatarId);

  useEffect(() => {
    mouthLevelRef.current = mouthLevel;
    speakingRef.current = isSpeaking;
  }, [isSpeaking, mouthLevel]);

  useEffect(() => {
    let disposed = false;
    let loadedPackage: PuruPuruAvatarPackage | null = null;

    void fetch(packageUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], "avatar.purupuru", {
          type: blob.type || "application/zip",
        });
        return loadPuruPuruPackage(file);
      })
      .then((avatarPackage) => {
        if (disposed) {
          avatarPackage.dispose();
          return;
        }
        loadedPackage = avatarPackage;
        packageRef.current = avatarPackage;
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });

    return () => {
      disposed = true;
      packageRef.current = null;
      loadedPackage?.dispose();
    };
  }, [packageUrl]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const controls = createPuruPuruRenderer({
      canvas,
      container,
      getAvatarPackage: () => packageRef.current,
      getVoiceLevel: () => mouthLevelRef.current * 0.12,
      getIsSpeaking: () => speakingRef.current,
      getIdleMotionEnabled: () => true,
      getViewTransform: () => transformRef.current,
      getEffectAnchor: () => DEFAULT_EFFECT_ANCHOR,
      getEffectAnchorEditorEnabled: () => false,
    });
    return () => controls.dispose();
  }, [transformRef]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!packageRef.current) return;
      event.preventDefault();
      const current = transformRef.current;
      setTransform({
        ...current,
        scale: current.scale * Math.exp(-event.deltaY * 0.0015),
      });
    },
    [setTransform, transformRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const endDrag = (pointerId: number, canvas: HTMLCanvasElement) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    dragRef.current = null;
    setIsDragging(false);
    flushPersistedTransform();
  };

  return (
    <div ref={containerRef} className={styles.renderer}>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${styles.interactiveCanvas}`}
        aria-label="PuruPuru avatar"
        data-avatar-view-id={avatarId}
        data-avatar-view-x={transform.x.toFixed(2)}
        data-avatar-view-y={transform.y.toFixed(2)}
        data-avatar-view-scale={transform.scale.toFixed(4)}
        onDoubleClick={() => {
          resetTransform();
        }}
        onPointerCancel={(event) => endDrag(event.pointerId, event.currentTarget)}
        onPointerDown={(event) => {
          if (event.button !== 0 || !packageRef.current) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: transformRef.current,
          };
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          setTransform({
            ...drag.origin,
            x: drag.origin.x + event.clientX - drag.startX,
            y: drag.origin.y + event.clientY - drag.startY,
          });
        }}
        onPointerUp={(event) => endDrag(event.pointerId, event.currentTarget)}
        style={{ cursor: isDragging ? "grabbing" : undefined }}
      />
      {error && <div className={styles.status}>PuruPuru: {error}</div>}
    </div>
  );
}
