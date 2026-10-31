import { usePiperDownload } from "../../hooks/usePiperDownload";
import type { PiperVoice } from "../../types";

export function PiperDownloadStatus({ voice }: { voice: PiperVoice }) {
  const { downloading, percent, text, error } = usePiperDownload(voice);
  if (!downloading && !error) return null;
  return (
    <div role="status" aria-live="polite" style={{ minWidth: 0 }}>
      {downloading && <progress max={100} value={percent ?? undefined}
        aria-label={text} style={{ width: "100%", display: "block" }} />}
      <span>{error ?? text}</span>
    </div>
  );
}
