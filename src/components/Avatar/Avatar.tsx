import { lazy, Suspense } from "react";
import type { AvatarPack } from "../../types";
import { PngAvatar } from "./renderers/PngAvatar";
import { PetAvatar } from "./renderers/PetAvatar";
import styles from "./Avatar.module.css";

interface Props {
  avatar: AvatarPack;
  mouthLevel: number;
  isSpeaking: boolean;
  isProcessing: boolean;
}

const PuruPuruAvatar = lazy(() =>
  import("./renderers/PuruPuruAvatar").then((module) => ({ default: module.PuruPuruAvatar }))
);
const VrmAvatar = lazy(() =>
  import("./renderers/VrmAvatar").then((module) => ({ default: module.VrmAvatar }))
);
const PsdAvatar = lazy(() =>
  import("./renderers/PsdAvatar").then((module) => ({ default: module.PsdAvatar }))
);
const Inochi2DAvatar = lazy(() =>
  import("./renderers/Inochi2DAvatar").then((module) => ({ default: module.Inochi2DAvatar }))
);

export function Avatar({ avatar, mouthLevel, isSpeaking, isProcessing }: Props) {
  let content;
  switch (avatar.kind) {
    case "png":
      content = <PngAvatar images={avatar.images} mouthLevel={mouthLevel} />;
      break;
    case "purupuru":
      content = (
        <PuruPuruAvatar
          packageUrl={avatar.packageUrl}
          mouthLevel={mouthLevel}
          isSpeaking={isSpeaking}
        />
      );
      break;
    case "pet":
      content = (
        <PetAvatar
          manifest={avatar.manifest}
          spritesheetUrl={avatar.spritesheetUrl}
          mouthLevel={mouthLevel}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
        />
      );
      break;
    case "vrm":
      content = (
        <VrmAvatar
          modelUrl={avatar.modelUrl}
          animationUrl={avatar.animationUrl}
          mouthLevel={mouthLevel}
        />
      );
      break;
    case "psd":
      content = <PsdAvatar modelUrl={avatar.modelUrl} mouthLevel={mouthLevel} />;
      break;
    case "inochi2d":
      content = (
        <Inochi2DAvatar
          name={avatar.name}
          modelUrl={avatar.modelUrl}
          motionUrl={avatar.motionUrl}
          manifestModelId={avatar.manifestModelId}
          mouthLevel={mouthLevel}
        />
      );
      break;
  }

  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.status}>アバターを読み込み中…</div>}>
        {content}
      </Suspense>
    </div>
  );
}
