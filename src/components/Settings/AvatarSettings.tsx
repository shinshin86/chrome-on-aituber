import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useI18n } from "../../i18n/useI18n";
import {
  AVATAR_KIND_LABELS,
  type AvatarKind,
  type AvatarPack,
  type PetManifest,
} from "../../types";
import {
  getAllAvatars,
  registerAvatar,
  registerFileAvatar,
  registerPetAvatar,
  removeAvatar,
} from "../../services/avatar/avatarService";
import styles from "./AvatarSettings.module.css";

interface Props {
  selectedAvatarId: string;
  onSelectAvatar: (id: string) => void;
}

interface AvatarFilePickerProps {
  label: string;
  accept: string;
  file: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

type SlotKey =
  | "mouthCloseEyesOpen"
  | "mouthCloseEyesClose"
  | "mouthOpenEyesOpen"
  | "mouthOpenEyesClose";

const AVATAR_KINDS = Object.keys(AVATAR_KIND_LABELS) as AvatarKind[];
const SLOT_KEYS: SlotKey[] = [
  "mouthCloseEyesOpen",
  "mouthCloseEyesClose",
  "mouthOpenEyesOpen",
  "mouthOpenEyesClose",
];
const EMPTY_PNG_FILES: Record<SlotKey, File | null> = {
  mouthCloseEyesOpen: null,
  mouthCloseEyesClose: null,
  mouthOpenEyesOpen: null,
  mouthOpenEyesClose: null,
};

const FILE_CONFIG: Record<
  Exclude<AvatarKind, "png" | "pet">,
  { primaryAccept: string; primaryLabel: string; secondaryAccept?: string; secondaryLabel?: string }
> = {
  purupuru: { primaryAccept: ".purupuru", primaryLabel: "PuruPuru package (.purupuru)" },
  vrm: {
    primaryAccept: ".vrm",
    primaryLabel: "VRM model (.vrm)",
    secondaryAccept: ".vrma",
    secondaryLabel: "Idle animation (.vrma / optional)",
  },
  psd: { primaryAccept: ".psd", primaryLabel: "PSD model (.psd)" },
  inochi2d: {
    primaryAccept: ".inx,.inp",
    primaryLabel: "Inochi2D model (.inx / .inp)",
    secondaryAccept: ".json",
    secondaryLabel: "Motion data (.json / optional)",
  },
};

const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

function fileMatchesAccept(file: File, accept: string): boolean {
  if (!accept.trim()) return true;

  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  return accept.split(",").some((rawRule) => {
    const rule = rawRule.trim().toLowerCase();
    if (!rule) return false;
    if (rule.startsWith(".")) return fileName.endsWith(rule);
    if (rule.endsWith("/*")) {
      if (mimeType.startsWith(rule.slice(0, -1))) return true;
      return rule === "image/*" && IMAGE_FILE_EXTENSION_PATTERN.test(fileName);
    }
    return mimeType === rule;
  });
}

function AvatarFilePicker({
  label,
  accept,
  file,
  disabled = false,
  onChange,
}: AvatarFilePickerProps) {
  const { t } = useI18n();
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState("");

  const fieldClassName = [
    styles.fileField,
    file ? styles.fileFieldSelected : "",
    dragActive ? styles.fileFieldDragActive : "",
    dropError ? styles.fileFieldInvalid : "",
    disabled ? styles.fileFieldDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  function isFileDrag(event: DragEvent<HTMLLabelElement>): boolean {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = disabled ? "none" : "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (dragDepthRef.current === 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (disabled) return;

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length !== 1) {
      setDropError(t("settings.avatar.dropSingleFile"));
      return;
    }

    const [droppedFile] = droppedFiles;
    if (!fileMatchesAccept(droppedFile, accept)) {
      setDropError(t("settings.avatar.dropInvalidType"));
      return;
    }

    setDropError("");
    onChange(droppedFile);
  }

  return (
    <label
      className={fieldClassName}
      data-file-drop-zone=""
      data-file-drop-active={dragActive ? "true" : "false"}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className={styles.fileLabel}>{label}</span>
      <span className={styles.filePickerRow}>
        <span className={styles.filePickerButton}>
          <svg
            className={styles.filePickerIcon}
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5V19h14v-4.5" />
          </svg>
          {file ? t("settings.avatar.changeFile") : t("settings.avatar.chooseFile")}
        </span>
        <span
          className={`${styles.fileName} ${file ? styles.fileNameSelected : ""}`}
          title={file?.name}
        >
          {file?.name ?? t("settings.avatar.noFileSelected")}
        </span>
      </span>
      <span
        className={`${styles.fileDropHint} ${dragActive ? styles.fileDropHintActive : ""}`}
      >
        {dragActive
          ? t("settings.avatar.dropActive")
          : t("settings.avatar.dropHint")}
      </span>
      {dropError && (
        <span className={styles.fileDropError} role="alert">
          {dropError}
        </span>
      )}
      <input
        className={styles.fileInput}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          setDropError("");
          onChange(event.target.files?.[0] ?? null);
        }}
      />
    </label>
  );
}

export function AvatarSettings({ selectedAvatarId, onSelectAvatar }: Props) {
  const { t } = useI18n();
  const [avatars, setAvatars] = useState<AvatarPack[]>([]);
  const avatarsRef = useRef<AvatarPack[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [kind, setKind] = useState<AvatarKind>("png");
  const [name, setName] = useState("");
  const [pngFiles, setPngFiles] = useState<Record<SlotKey, File | null>>(EMPTY_PNG_FILES);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [petManifestFile, setPetManifestFile] = useState<File | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const slots = useMemo(
    () => [
      { key: "mouthCloseEyesOpen" as const, label: t("settings.avatar.slots.normal.label") },
      { key: "mouthCloseEyesClose" as const, label: t("settings.avatar.slots.blink.label") },
      { key: "mouthOpenEyesOpen" as const, label: t("settings.avatar.slots.speaking.label") },
      { key: "mouthOpenEyesClose" as const, label: t("settings.avatar.slots.speakingBlink.label") },
    ],
    [t]
  );

  const replaceAvatarList = useCallback((next: AvatarPack[]) => {
    avatarsRef.current.forEach((avatar) => avatar.dispose?.());
    avatarsRef.current = next;
    setAvatars(next);
  }, []);

  const loadAvatars = useCallback(async () => {
    replaceAvatarList(await getAllAvatars());
  }, [replaceAvatarList]);

  useEffect(() => {
    void loadAvatars();
    return () => {
      avatarsRef.current.forEach((avatar) => avatar.dispose?.());
      avatarsRef.current = [];
    };
  }, [loadAvatars]);

  function resetRegisterForm() {
    setName("");
    setPngFiles(EMPTY_PNG_FILES);
    setPrimaryFile(null);
    setSecondaryFile(null);
    setPetManifestFile(null);
    setRegisterError("");
  }

  function handleKindChange(nextKind: AvatarKind) {
    setKind(nextKind);
    resetRegisterForm();
  }

  const allPngFilesSet = SLOT_KEYS.every((key) => pngFiles[key] !== null);
  const canRegister =
    name.trim().length > 0 &&
    (kind === "png"
      ? allPngFilesSet
      : kind === "pet"
        ? Boolean(primaryFile && petManifestFile)
        : Boolean(primaryFile));

  async function handleRegister() {
    if (!canRegister || registering) return;
    setRegistering(true);
    setRegisterError("");
    let pack: AvatarPack | undefined;
    try {
      if (kind === "png") {
        pack = await registerAvatar(name.trim(), {
          mouthCloseEyesOpen: pngFiles.mouthCloseEyesOpen!,
          mouthCloseEyesClose: pngFiles.mouthCloseEyesClose!,
          mouthOpenEyesOpen: pngFiles.mouthOpenEyesOpen!,
          mouthOpenEyesClose: pngFiles.mouthOpenEyesClose!,
        });
      } else if (kind === "pet") {
        const parsed = JSON.parse(await petManifestFile!.text()) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error(t("settings.avatar.invalidManifest"));
        }
        pack = await registerPetAvatar(name.trim(), parsed as PetManifest, primaryFile!);
      } else {
        pack = await registerFileAvatar(kind, name.trim(), primaryFile!, secondaryFile ?? undefined);
      }

      onSelectAvatar(pack.id);
      pack.dispose?.();
      resetRegisterForm();
      setShowRegisterForm(false);
      await loadAvatars();
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : t("settings.avatar.registerFailed"));
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    await removeAvatar(id);
    if (selectedAvatarId === id) onSelectAvatar("default");
    await loadAvatars();
  }

  return (
    <div>
      <div className={styles.avatarList}>
        {avatars.map((avatar) => (
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedAvatarId === avatar.id}
            key={avatar.id}
            className={`${styles.avatarItem} ${selectedAvatarId === avatar.id ? styles.selected : ""}`}
            onClick={() => onSelectAvatar(avatar.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectAvatar(avatar.id);
              }
            }}
          >
            {avatar.thumbnailUrl ? (
              <img src={avatar.thumbnailUrl} alt="" className={styles.avatarThumb} />
            ) : (
              <span className={styles.kindThumb}>{AVATAR_KIND_LABELS[avatar.kind]}</span>
            )}
            <span className={styles.avatarName}>{avatar.name}</span>
            <span className={styles.avatarMeta}>
              {avatar.isBuiltIn ? t("settings.avatar.builtIn") : t("settings.avatar.custom")}
            </span>
            {!avatar.isBuiltIn && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDelete(avatar.id);
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
          className={`${styles.avatarItem} ${styles.addAvatarItem} ${showRegisterForm ? styles.addAvatarItemActive : ""}`}
          onClick={() => setShowRegisterForm(true)}
        >
          <span className={styles.addAvatarIcon}>+</span>
          <span className={styles.avatarName}>{t("settings.avatar.add")}</span>
        </button>
      </div>

      {showRegisterForm && (
        <div className={styles.registerSection}>
          <h4 className={styles.registerTitle}>{t("settings.avatar.registerTitle")}</h4>
          <label className={styles.fieldLabel}>
            {t("settings.avatar.kind")}
            <select
              className={styles.kindSelect}
              value={kind}
              onChange={(event) => handleKindChange(event.target.value as AvatarKind)}
            >
              {AVATAR_KINDS.map((value) => (
                <option key={value} value={value}>{AVATAR_KIND_LABELS[value]}</option>
              ))}
            </select>
          </label>

          {kind === "png" ? (
            <div key="png" className={styles.slotGrid}>
              {slots.map((slot) => (
                <AvatarFilePicker
                  key={slot.key}
                  label={slot.label}
                  accept="image/*"
                  file={pngFiles[slot.key]}
                  disabled={registering}
                  onChange={(file) =>
                    setPngFiles((current) => ({
                      ...current,
                      [slot.key]: file,
                    }))
                  }
                />
              ))}
            </div>
          ) : kind === "pet" ? (
            <div key="pet" className={styles.fileFields}>
              <AvatarFilePicker
                label="Pet manifest (.json)"
                accept=".json,application/json"
                file={petManifestFile}
                disabled={registering}
                onChange={setPetManifestFile}
              />
              <AvatarFilePicker
                label="Spritesheet image"
                accept="image/*"
                file={primaryFile}
                disabled={registering}
                onChange={setPrimaryFile}
              />
            </div>
          ) : (
            <div key={kind} className={styles.fileFields}>
              <AvatarFilePicker
                label={FILE_CONFIG[kind].primaryLabel}
                accept={FILE_CONFIG[kind].primaryAccept}
                file={primaryFile}
                disabled={registering}
                onChange={setPrimaryFile}
              />
              {FILE_CONFIG[kind].secondaryLabel && (
                <AvatarFilePicker
                  label={FILE_CONFIG[kind].secondaryLabel}
                  accept={FILE_CONFIG[kind].secondaryAccept ?? ""}
                  file={secondaryFile}
                  disabled={registering}
                  onChange={setSecondaryFile}
                />
              )}
            </div>
          )}

          <input
            className={styles.nameInput}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("settings.avatar.namePlaceholder")}
          />
          {registerError && <div className={styles.errorText} role="alert">{registerError}</div>}
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
              disabled={!canRegister || registering}
              onClick={() => void handleRegister()}
            >
              {registering ? t("settings.avatar.registering") : t("settings.avatar.register")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
