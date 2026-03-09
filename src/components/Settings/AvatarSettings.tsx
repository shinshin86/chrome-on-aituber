import { useState, useEffect, useRef, useCallback } from "react";
import type { AvatarPack } from "../../types";
import {
  getAllAvatars,
  registerAvatar,
  removeAvatar,
  revokeAvatarUrls,
} from "../../services/avatar/avatarService";
import styles from "./AvatarSettings.module.css";

interface Props {
  selectedAvatarId: string;
  onSelectAvatar: (id: string) => void;
}

type SlotKey =
  | "mouthCloseEyesOpen"
  | "mouthCloseEyesClose"
  | "mouthOpenEyesOpen"
  | "mouthOpenEyesClose";

const SLOTS: { key: SlotKey; label: string; description: string }[] = [
  {
    key: "mouthCloseEyesOpen",
    label: "通常",
    description: "口閉じ・目開き",
  },
  {
    key: "mouthCloseEyesClose",
    label: "まばたき",
    description: "口閉じ・目閉じ",
  },
  {
    key: "mouthOpenEyesOpen",
    label: "発話中",
    description: "口開き・目開き",
  },
  {
    key: "mouthOpenEyesClose",
    label: "発話+まばたき",
    description: "口開き・目閉じ",
  },
];

export function AvatarSettings({ selectedAvatarId, onSelectAvatar }: Props) {
  const [avatars, setAvatars] = useState<AvatarPack[]>([]);
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    mouthCloseEyesOpen: null,
    mouthCloseEyesClose: null,
    mouthOpenEyesOpen: null,
    mouthOpenEyesClose: null,
  });
  const [previews, setPreviews] = useState<Record<SlotKey, string | null>>({
    mouthCloseEyesOpen: null,
    mouthCloseEyesClose: null,
    mouthOpenEyesOpen: null,
    mouthOpenEyesClose: null,
  });
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const fileInputRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    mouthCloseEyesOpen: null,
    mouthCloseEyesClose: null,
    mouthOpenEyesOpen: null,
    mouthOpenEyesClose: null,
  });

  const loadAvatars = useCallback(async () => {
    revokeAvatarUrls();
    const all = await getAllAvatars();
    setAvatars(all);
  }, []);

  useEffect(() => {
    loadAvatars();
  }, [loadAvatars]);

  // プレビュー URL の管理
  useEffect(() => {
    const urls: string[] = [];
    const newPreviews = { ...previews };
    for (const slot of SLOTS) {
      const file = files[slot.key];
      if (file) {
        const url = URL.createObjectURL(file);
        urls.push(url);
        newPreviews[slot.key] = url;
      } else {
        newPreviews[slot.key] = null;
      }
    }
    setPreviews(newPreviews);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  function handleFileChange(key: SlotKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }

  const allFilesSet = SLOTS.every((s) => files[s.key] !== null);

  async function handleRegister() {
    if (!allFilesSet || !name.trim() || registering) return;
    setRegistering(true);
    try {
      const pack = await registerAvatar(name.trim(), {
        mouthCloseEyesOpen: files.mouthCloseEyesOpen!,
        mouthCloseEyesClose: files.mouthCloseEyesClose!,
        mouthOpenEyesOpen: files.mouthOpenEyesOpen!,
        mouthOpenEyesClose: files.mouthOpenEyesClose!,
      });
      onSelectAvatar(pack.id);
      setFiles({
        mouthCloseEyesOpen: null,
        mouthCloseEyesClose: null,
        mouthOpenEyesOpen: null,
        mouthOpenEyesClose: null,
      });
      setName("");
      await loadAvatars();
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    await removeAvatar(id);
    if (selectedAvatarId === id) {
      onSelectAvatar("default");
    }
    await loadAvatars();
  }

  return (
    <div>
      {/* アバター一覧 */}
      <div className={styles.avatarList}>
        {avatars.map((a) => (
          <div
            key={a.id}
            className={`${styles.avatarItem} ${
              selectedAvatarId === a.id ? styles.selected : ""
            }`}
            onClick={() => onSelectAvatar(a.id)}
          >
            <img
              src={a.images.mouthCloseEyesOpen}
              alt={a.name}
              className={styles.avatarThumb}
            />
            <span className={styles.avatarName}>{a.name}</span>
            {!a.isBuiltIn && (
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(a.id);
                }}
                title="削除"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 新規登録 */}
      <div className={styles.registerSection}>
        <h4 className={styles.registerTitle}>新しいアバターを登録</h4>
        <span className={styles.registerHint}>
          4 枚の画像を設定してください（PNG / JPG 推奨）
        </span>

        <div className={styles.slotGrid}>
          {SLOTS.map((slot) => (
            <div key={slot.key} className={styles.slot}>
              <div
                className={styles.slotPreview}
                onClick={() => fileInputRefs.current[slot.key]?.click()}
              >
                {previews[slot.key] ? (
                  <img src={previews[slot.key]!} alt={slot.label} />
                ) : (
                  <span className={styles.slotPlaceholder}>+</span>
                )}
              </div>
              <div className={styles.slotLabel}>{slot.label}</div>
              <div className={styles.slotDesc}>{slot.description}</div>
              <input
                ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handleFileChange(slot.key, e.target.files?.[0] ?? null)
                }
              />
            </div>
          ))}
        </div>

        <input
          className={styles.nameInput}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="アバター名"
        />

        <button
          className={styles.registerBtn}
          disabled={!allFilesSet || !name.trim() || registering}
          onClick={handleRegister}
        >
          {registering ? "登録中..." : "登録する"}
        </button>
      </div>
    </div>
  );
}
