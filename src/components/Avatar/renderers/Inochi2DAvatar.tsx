import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInochi2D } from "../../../avatar-runtime/inochi2d/hooks/useInochi2D";
import {
  INOCHI2D_DEFAULT_CAMERA_SCALE,
  INOCHI2D_DEFAULT_CAMERA_X,
  INOCHI2D_DEFAULT_CAMERA_Y,
  INOCHI2D_MAX_CAMERA_SCALE,
  INOCHI2D_MIN_CAMERA_SCALE,
} from "../../../avatar-runtime/inochi2d/lib/inochi2dConstants";
import { buildCustomInochiModel } from "../../../avatar-runtime/inochi2d/lib/inochi2dManifest";
import { getInochiRuntimeSession } from "../../../avatar-runtime/inochi2d/lib/inochi2dRuntimeSession";
import type { InochiCameraTransform } from "../../../avatar-runtime/inochi2d/types/inochi2d";
import { useAvatarViewTransform } from "../../../hooks/useAvatarViewTransform";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  name: string;
  modelUrl?: string;
  motionUrl?: string;
  manifestModelId?: string;
  mouthLevel: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: InochiCameraTransform;
}

export function Inochi2DAvatar({
  avatarId,
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
    activeModel,
    isWebGLSupported,
    cameraTransform,
    setCameraTransform,
  } = useInochi2D({
    selectedModelId: customModel?.id ?? manifestModelId,
    customModel,
  });
  const defaultCameraTransform = useMemo<InochiCameraTransform>(
    () => ({
      x: activeModel?.camera?.x ?? INOCHI2D_DEFAULT_CAMERA_X,
      y: activeModel?.camera?.y ?? INOCHI2D_DEFAULT_CAMERA_Y,
      scale: activeModel?.camera?.scale ?? INOCHI2D_DEFAULT_CAMERA_SCALE,
    }),
    [activeModel]
  );
  const {
    transformRef,
    hasPersistedTransform,
    setTransform,
    resetTransform,
    flushPersistedTransform,
  } = useAvatarViewTransform(avatarId, {
    defaultTransform: defaultCameraTransform,
    minScale: INOCHI2D_MIN_CAMERA_SCALE,
    maxScale: INOCHI2D_MAX_CAMERA_SCALE,
  });
  const cameraTransformRef = useRef(cameraTransform);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const restoredModelRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    cameraTransformRef.current = cameraTransform;
  }, [cameraTransform]);

  useEffect(() => {
    if (status !== "ready" || !activeModel) return;
    if (restoredModelRef.current === activeModel.id) return;
    restoredModelRef.current = activeModel.id;
    if (!hasPersistedTransform) return;
    cameraTransformRef.current = transformRef.current;
    void setCameraTransform(transformRef.current);
  }, [activeModel, hasPersistedTransform, setCameraTransform, status, transformRef]);

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

  const setCombinedCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasElementRef.current = node;
      canvasRef(node);
    },
    [canvasRef]
  );

  const applyTransform = useCallback(
    (nextTransform: InochiCameraTransform) => {
      const persistedTransform = setTransform(nextTransform);
      cameraTransformRef.current = persistedTransform;
      void setCameraTransform(persistedTransform);
    },
    [setCameraTransform, setTransform]
  );

  const endDrag = (pointerId: number, canvas: HTMLCanvasElement) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    dragRef.current = null;
    setIsDragging(false);
    flushPersistedTransform();
  };

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (status !== "ready") return;
      event.preventDefault();
      const current = cameraTransformRef.current;
      applyTransform({
        ...current,
        scale: current.scale * Math.exp(-event.deltaY * 0.0015),
      });
    },
    [applyTransform, status]
  );

  useEffect(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className={styles.renderer}>
      <canvas
        ref={setCombinedCanvasRef}
        className={`${styles.canvas} ${styles.interactiveCanvas}`}
        aria-label="Inochi2D avatar"
        data-avatar-view-id={avatarId}
        data-avatar-view-x={cameraTransform.x.toFixed(2)}
        data-avatar-view-y={cameraTransform.y.toFixed(2)}
        data-avatar-view-scale={cameraTransform.scale.toFixed(4)}
        onDoubleClick={() => {
          const nextTransform = resetTransform();
          cameraTransformRef.current = nextTransform;
          void setCameraTransform(nextTransform);
        }}
        onPointerCancel={(event) => endDrag(event.pointerId, event.currentTarget)}
        onPointerDown={(event) => {
          if (event.button !== 0 || status !== "ready") return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: cameraTransformRef.current,
          };
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          applyTransform({
            x: drag.origin.x + (event.clientX - drag.startX) / drag.origin.scale,
            y: drag.origin.y + (event.clientY - drag.startY) / drag.origin.scale,
            scale: drag.origin.scale,
          });
        }}
        onPointerUp={(event) => endDrag(event.pointerId, event.currentTarget)}
        style={{ cursor: isDragging ? "grabbing" : undefined }}
      />
      {(!isWebGLSupported || status === "error") && (
        <div className={styles.status}>
          {!isWebGLSupported ? "WebGLを利用できません" : error || "Inochi2Dの読み込みに失敗しました"}
        </div>
      )}
    </div>
  );
}
