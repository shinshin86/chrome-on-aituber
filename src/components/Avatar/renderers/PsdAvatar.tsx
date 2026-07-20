// Anime2.5DRig's MIT-licensed runtime exposes globalThis.Rigger.
import "../../../avatar-runtime/psd/vendor/anime25drig/rigger.js";
import { useEffect, useRef } from "react";
import { useBlink } from "../../../hooks/useBlink";
import { usePsdAvatar } from "../../../avatar-runtime/psd/hooks/usePsdAvatar";
import { renderPsdToCanvas } from "../../../avatar-runtime/psd/lib/psdRenderer";
import {
  createAnime25RigAvatar,
  type Anime25RigAvatar,
} from "../../../avatar-runtime/psd/lib/rig/anime25Renderer";
import { AvatarViewLayer } from "../AvatarViewLayer";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  modelUrl: string;
  mouthLevel: number;
}

function StaticPsdCanvas({
  avatar,
  mouthLevel,
}: {
  avatar: ReturnType<typeof usePsdAvatar>;
  mouthLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isBlinking = useBlink();

  useEffect(() => {
    if (!avatar.model || !canvasRef.current) return;
    renderPsdToCanvas(
      avatar.model,
      canvasRef.current,
      avatar.visibility,
      avatar.roles,
      { mouthOpen: mouthLevel > 0.18, eyesClosed: isBlinking }
    );
  }, [avatar.model, avatar.roles, avatar.visibility, isBlinking, mouthLevel]);

  return <canvas ref={canvasRef} className={styles.modelCanvas} aria-label="PSD avatar" />;
}

function MotionPsdCanvas({
  avatar,
  mouthLevel,
}: {
  avatar: ReturnType<typeof usePsdAvatar>;
  mouthLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rigAvatarRef = useRef<Anime25RigAvatar | null>(null);
  const rig = avatar.rig?.rig;

  useEffect(() => {
    if (!rig || !canvasRef.current) return;
    const rigAvatar = createAnime25RigAvatar(canvasRef.current, rig);
    rigAvatarRef.current = rigAvatar;
    rigAvatar.setMotionEnabled(true);
    rigAvatar.setIntensity(1);
    return () => {
      rigAvatar.dispose();
      rigAvatarRef.current = null;
    };
  }, [rig]);

  useEffect(() => {
    rigAvatarRef.current?.setMouthOpen(mouthLevel);
  }, [mouthLevel]);

  useEffect(() => {
    rigAvatarRef.current?.setMotionProfile(avatar.motionProfile);
  }, [avatar.motionProfile]);

  return <canvas ref={canvasRef} className={styles.modelCanvas} aria-label="Motion PSD avatar" />;
}

export function PsdAvatar({ avatarId, modelUrl, mouthLevel }: Props) {
  const avatar = usePsdAvatar();

  useEffect(() => {
    let active = true;
    void fetch(modelUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!active) return;
        await avatar.loadFile(
          new File([blob], "avatar.psd", { type: blob.type || "image/vnd.adobe.photoshop" })
        );
      })
      .catch((error: unknown) => {
        if (active) console.error("Failed to load PSD avatar:", error);
      });
    return () => {
      active = false;
    };
    // The controller object changes with load state; reloading is keyed only by the model URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  return (
    <div className={styles.renderer}>
      {avatar.mode === "motion" && avatar.rig?.rig ? (
        <AvatarViewLayer avatarId={avatarId}>
          <MotionPsdCanvas avatar={avatar} mouthLevel={mouthLevel} />
        </AvatarViewLayer>
      ) : avatar.model ? (
        <AvatarViewLayer avatarId={avatarId}>
          <StaticPsdCanvas avatar={avatar} mouthLevel={mouthLevel} />
        </AvatarViewLayer>
      ) : (
        <div className={styles.status}>
          {avatar.error || (avatar.loading ? "PSDを読み込み中…" : "PSDを準備中…")}
        </div>
      )}
    </div>
  );
}
