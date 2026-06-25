import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { DragEvent } from "react";
import { useI18n } from "../../i18n/I18nContext";
import type { AvatarPack } from "../../types";
import {
  getAllAvatars,
  getDefaultAvatar,
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

const SLOT_KEYS: SlotKey[] = [
  "mouthCloseEyesOpen",
  "mouthCloseEyesClose",
  "mouthOpenEyesOpen",
  "mouthOpenEyesClose",
];

const DEFAULT_AVATAR_IMAGES = getDefaultAvatar().images;

export function AvatarSettings({ selectedAvatarId, onSelectAvatar }: Props) {
  const { t } = useI18n();
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
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [draggingSlot, setDraggingSlot] = useState<SlotKey | null>(null);
  const fileInputRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    mouthCloseEyesOpen: null,
    mouthCloseEyesClose: null,
    mouthOpenEyesOpen: null,
    mouthOpenEyesClose: null,
  });
  const slots = useMemo(
    () => [
      {
        key: "mouthCloseEyesOpen" as const,
        label: t("settings.avatar.slots.normal.label"),
        description: t("settings.avatar.slots.normal.description"),
      },
      {
        key: "mouthCloseEyesClose" as const,
        label: t("settings.avatar.slots.blink.label"),
        description: t("settings.avatar.slots.blink.description"),
      },
      {
        key: "mouthOpenEyesOpen" as const,
        label: t("settings.avatar.slots.speaking.label"),
        description: t("settings.avatar.slots.speaking.description"),
      },
      {
        key: "mouthOpenEyesClose" as const,
        label: t("settings.avatar.slots.speakingBlink.label"),
        description: t("settings.avatar.slots.speakingBlink.description"),
      },
    ],
    [t]
  );

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
    for (const key of SLOT_KEYS) {
      const file = files[key];
      if (file) {
        const url = URL.createObjectURL(file);
        urls.push(url);
        newPreviews[key] = url;
      } else {
        newPreviews[key] = null;
      }
    }
    setPreviews(newPreviews);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  function handleFileChange(key: SlotKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }

  function resetRegisterForm() {
    setFiles({
      mouthCloseEyesOpen: null,
      mouthCloseEyesClose: null,
      mouthOpenEyesOpen: null,
      mouthOpenEyesClose: null,
    });
    setName("");
    setDraggingSlot(null);
  }

  function pickImageFile(fileList: FileList): File | null {
    return Array.from(fileList).find((file) => file.type.startsWith("image/")) ?? null;
  }

  function handleSlotDragOver(
    e: DragEvent<HTMLDivElement>,
    key: SlotKey
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDraggingSlot(key);
  }

  function handleSlotDragLeave(
    e: DragEvent<HTMLDivElement>,
    key: SlotKey
  ) {
    const nextTarget = e.relatedTarget;
    if (nextTarget instanceof Node && e.currentTarget.contains(nextTarget)) {
      return;
    }
    setDraggingSlot((current) => (current === key ? null : current));
  }

  function handleSlotDrop(e: DragEvent<HTMLDivElement>, key: SlotKey) {
    e.preventDefault();
    setDraggingSlot(null);
    const file = pickImageFile(e.dataTransfer.files);
    if (file) {
      handleFileChange(key, file);
    }
  }

  const allFilesSet = SLOT_KEYS.every((key) => files[key] !== null);

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
      resetRegisterForm();
      setShowRegisterForm(false);
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
                title={t("settings.avatar.deleteTitle")}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className={`${styles.avatarItem} ${styles.addAvatarItem} ${
            showRegisterForm ? styles.addAvatarItemActive : ""
          }`}
          onClick={() => setShowRegisterForm(true)}
        >
          <span className={styles.addAvatarIcon}>+</span>
          <span className={styles.avatarName}>{t("settings.avatar.add")}</span>
        </button>
      </div>

      {showRegisterForm && (
        <div className={styles.registerSection}>
          <h4 className={styles.registerTitle}>
            {t("settings.avatar.registerTitle")}
          </h4>
          <span className={styles.registerHint}>
            {t("settings.avatar.registerHint")}
          </span>

          <div className={styles.slotGrid}>
            {slots.map((slot) => (
              <div key={slot.key} className={styles.slot}>
                <div
                  className={`${styles.slotPreview} ${
                    draggingSlot === slot.key ? styles.dragActive : ""
                  }`}
                  onClick={() => fileInputRefs.current[slot.key]?.click()}
                  onDragOver={(e) => handleSlotDragOver(e, slot.key)}
                  onDragLeave={(e) => handleSlotDragLeave(e, slot.key)}
                  onDragEnd={() => setDraggingSlot(null)}
                  onDrop={(e) => handleSlotDrop(e, slot.key)}
                >
                  {previews[slot.key] ? (
                    <img
                      className={styles.slotImage}
                      src={previews[slot.key]!}
                      alt={slot.label}
                    />
                  ) : (
                    <>
                      <img
                        className={styles.slotGuideImage}
                        src={DEFAULT_AVATAR_IMAGES[slot.key]}
                        alt=""
                        aria-hidden="true"
                      />
                      <span className={styles.slotPlaceholder}>+</span>
                    </>
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
            placeholder={t("settings.avatar.namePlaceholder")}
          />

          <div className={styles.registerActions}>
            <button
              className={styles.cancelBtn}
              type="button"
              disabled={registering}
              onClick={() => {
                resetRegisterForm();
                setShowRegisterForm(false);
              }}
            >
              {t("settings.avatar.cancel")}
            </button>
            <button
              className={styles.registerBtn}
              type="button"
              disabled={!allFilesSet || !name.trim() || registering}
              onClick={handleRegister}
            >
              {registering
                ? t("settings.avatar.registering")
                : t("settings.avatar.register")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
