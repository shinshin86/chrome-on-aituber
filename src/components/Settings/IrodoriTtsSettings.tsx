import { useEffect, useRef, useState } from "react";
import {
  deleteAssets,
  downloadAssets,
  fetchManifest,
  formatBytes,
  isDownloaded,
  isWebGpuSupported,
  type DownloadProgress,
  type IrodoriManifest,
} from "../../services/tts/irodoriAssets";
import {
  clearReferenceAudio,
  getReferenceAudioName,
  setReferenceAudio,
} from "../../services/tts/irodoriTtsProvider";
import styles from "./Settings.module.css";

const IRODORI_OFFICIAL_URL = "https://github.com/Aratako/Irodori-TTS";

type WebGpuState = "checking" | "supported" | "unsupported";

type ModelState =
  | "checking"
  | "manifest_missing"
  | "not_downloaded"
  | "downloading"
  | "downloaded";

export function IrodoriTtsSettings() {
  const [webgpu, setWebgpu] = useState<WebGpuState>("checking");
  const [modelState, setModelState] = useState<ModelState>("checking");
  const [manifest, setManifest] = useState<IrodoriManifest | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState("");
  const [referenceAudioName, setReferenceAudioName] = useState<string | null>(
    () => getReferenceAudioName()
  );
  const [referenceAudioBusy, setReferenceAudioBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supported = await isWebGpuSupported();
      if (cancelled) return;
      setWebgpu(supported ? "supported" : "unsupported");

      try {
        const m = await fetchManifest();
        if (cancelled) return;
        setManifest(m);
        const downloaded = await isDownloaded(m);
        if (cancelled) return;
        setModelState(downloaded ? "downloaded" : "not_downloaded");
      } catch {
        if (!cancelled) setModelState("manifest_missing");
      }
    }

    void check();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  async function handleDownload() {
    if (!manifest || modelState === "downloading") return;

    setError("");
    setModelState("downloading");
    setProgress(null);
    abortRef.current = new AbortController();

    try {
      await downloadAssets(manifest, setProgress, abortRef.current.signal);
      setModelState("downloaded");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setModelState("not_downloaded");
      } else {
        setError(
          e instanceof Error ? e.message : "モデルのダウンロードに失敗しました"
        );
        setModelState("not_downloaded");
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  function handleCancelDownload() {
    abortRef.current?.abort();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "ダウンロード済みの Irodori TTS モデルを削除して容量を解放します。よろしいですか？"
    );
    if (!confirmed) return;

    setError("");
    try {
      await deleteAssets();
      setModelState("not_downloaded");
    } catch {
      setError("モデルの削除に失敗しました");
    }
  }

  async function handleReferenceAudioChange(file: File | null) {
    if (!file || referenceAudioBusy) return;

    setError("");
    setReferenceAudioBusy(true);
    try {
      await setReferenceAudio(file);
      setReferenceAudioName(file.name);
    } catch {
      setError("参照音声の読み込みに失敗しました。.wav ファイルを選択してください。");
    } finally {
      if (referenceInputRef.current) {
        referenceInputRef.current.value = "";
      }
      setReferenceAudioBusy(false);
    }
  }

  function handleClearReferenceAudio() {
    clearReferenceAudio();
    setReferenceAudioName(null);
  }

  const progressPercent =
    progress && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.loadedBytes / progress.totalBytes) * 100))
      : null;

  return (
    <div className={styles.irodoriBox}>
      {/* WebGPU 対応状況 */}
      {webgpu === "checking" && (
        <p className={styles.hint}>WebGPU 対応状況を確認中...</p>
      )}
      {webgpu === "unsupported" && (
        <p className={styles.warningText}>
          このブラウザは WebGPU に対応していないため、Irodori TTS は利用できません。Piper
          Plus（標準）をご利用ください。
        </p>
      )}

      {webgpu === "supported" && (
        <>
          {/* モデル状態 */}
          {modelState === "checking" && (
            <p className={styles.hint}>モデルの状態を確認中...</p>
          )}

          {modelState === "manifest_missing" && (
            <p className={styles.warningText}>
              Irodori TTS のモデル配信情報（manifest）が見つかりません。アセットが配信されてから再度お試しください。
            </p>
          )}

          {(modelState === "not_downloaded" || modelState === "downloading") && (
            <>
              <p className={styles.hint}>
                モデルは未ダウンロードです（必要容量:{" "}
                {manifest ? `約 ${formatBytes(manifest.estimatedSizeBytes)}` : "約 1GB"}
                の空き容量推奨）。ダウンロードはこのボタンを押したときのみ行われます。
              </p>

              <div className={styles.actionRow}>
                <button
                  className={styles.subActionBtn}
                  type="button"
                  disabled={modelState === "downloading"}
                  onClick={() => void handleDownload()}
                >
                  {modelState === "downloading"
                    ? "ダウンロード中..."
                    : "Irodori TTS モデルをダウンロード"}
                </button>
                {modelState === "downloading" && (
                  <button
                    className={styles.secondaryBtn}
                    type="button"
                    onClick={handleCancelDownload}
                  >
                    中止
                  </button>
                )}
              </div>

              {modelState === "downloading" && (
                <>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progressPercent ?? 0}%` }}
                    />
                  </div>
                  <p className={styles.hint}>
                    {progress
                      ? `${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes)}（${progress.fileIndex}/${progress.fileCount} ファイル）`
                      : "ダウンロードを開始しています..."}
                  </p>
                </>
              )}
            </>
          )}

          {modelState === "downloaded" && (
            <>
              <p className={styles.hint}>モデルはダウンロード済みです。</p>

              {/* 参照音声アップロード */}
              <p className={styles.hint}>
                Irodori TTS は参照音声をもとに声質を生成します。使用権限のある .wav
                音声を選択してください。参照音声は保存されず、このセッション内でのみ使用されます。
              </p>

              <input
                ref={referenceInputRef}
                type="file"
                accept=".wav,audio/wav,audio/x-wav"
                hidden
                onChange={(e) =>
                  void handleReferenceAudioChange(e.target.files?.[0] ?? null)
                }
              />

              <div className={styles.actionRow}>
                <button
                  className={styles.subActionBtn}
                  type="button"
                  disabled={referenceAudioBusy}
                  onClick={() => referenceInputRef.current?.click()}
                >
                  {referenceAudioBusy
                    ? "読み込み中..."
                    : referenceAudioName
                      ? "参照音声を変更"
                      : "参照音声（.wav）を選択"}
                </button>
                <button
                  className={styles.secondaryBtn}
                  type="button"
                  disabled={!referenceAudioName}
                  onClick={handleClearReferenceAudio}
                >
                  クリア
                </button>
              </div>

              <p className={styles.hint}>
                {referenceAudioName
                  ? `現在の参照音声: ${referenceAudioName}`
                  : "参照音声が未設定のため、まだ音声合成はできません"}
              </p>

              <div className={styles.actionRow}>
                <button
                  className={styles.secondaryBtn}
                  type="button"
                  onClick={() => void handleDelete()}
                >
                  モデルを削除して容量を解放
                </button>
              </div>
            </>
          )}

          <p className={styles.hint}>
            音声クローンによるなりすましや、聞き手の誤認を招く用途には使用しないでください。音声サンプルやデモは{" "}
            <a href={IRODORI_OFFICIAL_URL} target="_blank" rel="noreferrer">
              Irodori TTS の公式ページ
            </a>{" "}
            を確認してください。
          </p>
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
