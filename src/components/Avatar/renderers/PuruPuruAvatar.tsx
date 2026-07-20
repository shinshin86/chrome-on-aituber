import { useEffect, useRef, useState } from "react";
import { loadPuruPuruPackage } from "../../../avatar-runtime/purupuru/lib/purupuruPackage";
import { createPuruPuruRenderer } from "../../../avatar-runtime/purupuru/lib/purupuruRenderer";
import type { PuruPuruAvatarPackage } from "../../../avatar-runtime/purupuru/lib/purupuruPackage";
import styles from "../Avatar.module.css";

interface Props {
  packageUrl: string;
  mouthLevel: number;
  isSpeaking: boolean;
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

export function PuruPuruAvatar({ packageUrl, mouthLevel, isSpeaking }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const packageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const mouthLevelRef = useRef(mouthLevel);
  const speakingRef = useRef(isSpeaking);
  const [error, setError] = useState("");

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
      getViewTransform: () => ({ x: 0, y: 0, scale: 1 }),
      getEffectAnchor: () => DEFAULT_EFFECT_ANCHOR,
      getEffectAnchorEditorEnabled: () => false,
    });
    return () => controls.dispose();
  }, []);

  return (
    <div ref={containerRef} className={styles.renderer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="PuruPuru avatar" />
      {error && <div className={styles.status}>PuruPuru: {error}</div>}
    </div>
  );
}
