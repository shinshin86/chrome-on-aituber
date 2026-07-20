import { useMemo } from "react";
import type { AvatarImages } from "../../../types";
import { useBlink } from "../../../hooks/useBlink";
import { getSpriteUrl } from "../../../services/avatar/avatarService";
import styles from "../Avatar.module.css";

interface Props {
  images: AvatarImages;
  mouthLevel: number;
}

export function PngAvatar({ images, mouthLevel }: Props) {
  const isBlinking = useBlink();
  const src = useMemo(
    () => getSpriteUrl(images, mouthLevel > 0.18, !isBlinking),
    [images, isBlinking, mouthLevel]
  );

  return <img src={src} alt="Avatar" className={styles.sprite} />;
}
