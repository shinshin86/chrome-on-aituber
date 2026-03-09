import { useEffect, useRef } from "react";

/**
 * setInterval をカスタムフック化。
 * delay に null を渡すとタイマー停止。
 */
export function useInterval(
  callback: () => void,
  delay: number | null
): void {
  const saved = useRef<() => void>(() => {});

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
