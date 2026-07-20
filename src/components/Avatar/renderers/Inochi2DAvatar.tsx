import { useEffect, useMemo } from "react";
import { useInochi2D } from "../../../avatar-runtime/inochi2d/hooks/useInochi2D";
import { buildCustomInochiModel } from "../../../avatar-runtime/inochi2d/lib/inochi2dManifest";
import { getInochiRuntimeSession } from "../../../avatar-runtime/inochi2d/lib/inochi2dRuntimeSession";
import styles from "../Avatar.module.css";

interface Props {
  name: string;
  modelUrl?: string;
  motionUrl?: string;
  manifestModelId?: string;
  mouthLevel: number;
}

export function Inochi2DAvatar({
  name,
  modelUrl,
  motionUrl,
  manifestModelId,
  mouthLevel,
}: Props) {
  const customModel = useMemo(() => {
    if (!modelUrl) return null;
    const model = buildCustomInochiModel({ name, modelUrl });
    return model ? { ...model, motionUrl } : null;
  }, [modelUrl, motionUrl, name]);
  const {
    canvasRef,
    status,
    error,
    isWebGLSupported,
  } = useInochi2D({
    selectedModelId: customModel?.id ?? manifestModelId,
    customModel,
  });

  useEffect(() => {
    if (status !== "ready") return;
    const controller = getInochiRuntimeSession()?.getController();
    if (!controller) return;
    if (controller.setLipSyncValue) {
      void Promise.resolve(
        controller.setLipSyncValue(mouthLevel, {
          viseme: mouthLevel > 0.02 ? "a" : "neutral",
          immediate: true,
        })
      );
      return;
    }
    const parameterIds = getInochiRuntimeSession()?.getRegisteredParameterIds() ?? [];
    if (parameterIds.includes("Mouth:: Shape") && controller.setParameterVector) {
      void Promise.resolve(controller.setParameterVector("Mouth:: Shape", 1, mouthLevel));
    } else {
      const parameterId = ["Mouth:: Open", "Mouth:: Openness", "Mouth Open"].find((id) =>
        parameterIds.includes(id)
      );
      if (parameterId) void Promise.resolve(controller.setParameter(parameterId, mouthLevel));
    }
  }, [mouthLevel, status]);

  return (
    <div className={styles.renderer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Inochi2D avatar" />
      {(!isWebGLSupported || status === "error") && (
        <div className={styles.status}>
          {!isWebGLSupported ? "WebGLを利用できません" : error || "Inochi2Dの読み込みに失敗しました"}
        </div>
      )}
    </div>
  );
}
