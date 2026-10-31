import { useEffect, useRef, useState } from "react";
import { loadMeshAvatar, type MeshAvatar as MeshAvatarInstance } from "mesh-avatar";
import { AvatarViewLayer } from "../AvatarViewLayer";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  packageUrl: string;
  mouthLevel: number;
  isSpeaking: boolean;
}

export function MeshAvatar({ avatarId, packageUrl, mouthLevel, isSpeaking }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [avatar, setAvatar] = useState<MeshAvatarInstance | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let instance: MeshAvatarInstance | null = null;

    // The runtime opens .mavatar archives from a Blob, so blob: URLs of
    // uploaded avatars work the same way as the bundled file.
    void fetch(packageUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => loadMeshAvatar(canvas, blob))
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        instance = created;
        setAvatar(created);
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });

    return () => {
      disposed = true;
      instance?.destroy();
      setAvatar(null);
    };
  }, [packageUrl]);

  useEffect(() => {
    avatar?.setVoiceLevel(mouthLevel);
  }, [avatar, mouthLevel]);

  useEffect(() => {
    avatar?.setSpeaking(isSpeaking);
  }, [avatar, isSpeaking]);

  return (
    <>
      <AvatarViewLayer avatarId={avatarId}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="Mesh avatar" />
      </AvatarViewLayer>
      {error && <div className={styles.status}>Mesh Avatar: {error}</div>}
    </>
  );
}
