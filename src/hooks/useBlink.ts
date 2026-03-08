import { useState, useEffect, useRef } from "react";

export function useBlink() {
  const [isBlinking, setIsBlinking] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function scheduleBlink() {
      const interval = 2000 + Math.random() * 4000;
      timeoutRef.current = window.setTimeout(() => {
        setIsBlinking(true);
        timeoutRef.current = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 100 + Math.random() * 100);
      }, interval);
    }

    scheduleBlink();
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  return isBlinking;
}
