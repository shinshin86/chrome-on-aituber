import { useEffect, useState } from "react";
import type { PetManifest } from "../../../types";
import { AvatarViewLayer } from "../AvatarViewLayer";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  manifest: PetManifest;
  spritesheetUrl: string;
  mouthLevel: number;
  isSpeaking: boolean;
  isProcessing: boolean;
}

const ROWS = {
  idle: { row: 0, frames: 6, frameMs: 180 },
  speaking: { row: 7, frames: 6, frameMs: 95 },
  thinking: { row: 8, frames: 6, frameMs: 150 },
} as const;

export function PetAvatar({
  avatarId,
  manifest,
  spritesheetUrl,
  mouthLevel,
  isSpeaking,
  isProcessing,
}: Props) {
  const action = isSpeaking || mouthLevel > 0.05 ? "speaking" : isProcessing ? "thinking" : "idle";
  const row = ROWS[action];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setFrame((current) => (current + 1) % row.frames),
      row.frameMs
    );
    return () => window.clearInterval(intervalId);
  }, [action, row.frameMs, row.frames]);

  return (
    <AvatarViewLayer avatarId={avatarId}>
      <div className={styles.petStage} aria-label="Pet stage">
        <div
          className={`${styles.petSprite} ${isSpeaking ? styles.petSpeaking : ""}`}
          role="img"
          aria-label={manifest.displayName || "Pet avatar"}
          style={{
            backgroundImage: `url(${spritesheetUrl})`,
            backgroundPosition: `${(frame / 7) * 100}% ${(row.row / 8) * 100}%`,
          }}
        />
      </div>
    </AvatarViewLayer>
  );
}
