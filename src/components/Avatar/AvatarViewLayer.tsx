import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAvatarViewTransform } from "../../hooks/useAvatarViewTransform";
import type { AvatarViewTransform } from "../../types";
import styles from "./Avatar.module.css";

interface Props {
  avatarId: string;
  children: ReactNode;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: AvatarViewTransform;
}

export function AvatarViewLayer({ avatarId, children }: Props) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    transform,
    transformRef,
    setTransform,
    resetTransform,
    flushPersistedTransform,
  } = useAvatarViewTransform(avatarId);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const layer = layerRef.current;
      if (!layer) return;

      const current = transformRef.current;
      const nextScale = Math.min(
        4,
        Math.max(0.25, current.scale * Math.exp(-event.deltaY * 0.0015))
      );
      const rect = (layer.parentElement ?? layer).getBoundingClientRect();
      const pointerX = event.clientX - (rect.left + rect.width / 2);
      const pointerY = event.clientY - (rect.top + rect.height / 2);
      const scaleRatio = nextScale / current.scale;
      setTransform({
        x: pointerX - (pointerX - current.x) * scaleRatio,
        y: pointerY - (pointerY - current.y) * scaleRatio,
        scale: nextScale,
      });
    },
    [setTransform, transformRef]
  );

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.addEventListener("wheel", handleWheel, { passive: false });
    return () => layer.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const endDrag = (pointerId: number, element: HTMLDivElement) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    dragRef.current = null;
    setIsDragging(false);
    flushPersistedTransform();
  };

  return (
    <div
      ref={layerRef}
      className={`${styles.viewLayer} ${isDragging ? styles.viewLayerDragging : ""}`}
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      }}
      data-avatar-view-id={avatarId}
      data-avatar-view-x={transform.x.toFixed(2)}
      data-avatar-view-y={transform.y.toFixed(2)}
      data-avatar-view-scale={transform.scale.toFixed(4)}
      onDoubleClick={resetTransform}
      onPointerCancel={(event) => endDrag(event.pointerId, event.currentTarget)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
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
    >
      {children}
    </div>
  );
}
