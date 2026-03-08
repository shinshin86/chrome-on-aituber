import { useMemo } from "react";
import type { AvatarImages } from "../../types";
import { getSpriteUrl } from "../../services/avatar/avatarService";
import { useBlink } from "../../hooks/useBlink";
import styles from "./Avatar.module.css";

interface Props {
  images: AvatarImages;
  mouthOpen: boolean;
}

export function Avatar({ images, mouthOpen }: Props) {
  const isBlinking = useBlink();

  const src = useMemo(
    () => getSpriteUrl(images, mouthOpen, !isBlinking),
    [images, mouthOpen, isBlinking]
  );

  return (
    <div className={styles.container}>
      <img src={src} alt="Avatar" className={styles.sprite} />
    </div>
  );
}
