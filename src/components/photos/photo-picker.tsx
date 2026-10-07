"use client";

import { CameraIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { PHOTO_PHASE_LABELS } from "@/lib/constants";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import { PHOTO_PHASES, type PhotoPhase } from "@/types/domain";

export interface PickedPhoto {
  key: string;
  file: File;
  previewUrl: string;
  phase: PhotoPhase;
}

export const MAX_PICKED_PHOTOS = 10;

/** FormData に写真を追加（photos[] と photoPhases[] を同じ順序で） */
export function appendPhotos(formData: FormData, photos: PickedPhoto[]) {
  formData.delete("photos");
  formData.delete("photoPhases");
  for (const photo of photos) {
    formData.append("photos", photo.file);
    formData.append("photoPhases", photo.phase);
  }
}

/**
 * 現場写真の選択・撮影。スマートフォンではカメラ / ライブラリから選べる。
 * 選択時にブラウザ側で縮小し、施工前・中・後を1タップで切り替えられる。
 */
export function PhotoPicker({
  photos,
  onChange,
  defaultPhase = "during",
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  defaultPhase?: PhotoPhase;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);

  // アンマウント時にプレビュー用 URL を解放
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX_PICKED_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`写真は一度に${MAX_PICKED_PHOTOS}枚までです`);
      return;
    }
    setProcessing(true);
    try {
      const files = Array.from(list).slice(0, room);
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      const added = compressed.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        phase: defaultPhase,
      }));
      onChange([...photos, ...added]);
      if (list.length > room) toast.warning(`写真は一度に${MAX_PICKED_PHOTOS}枚までのため、${room}枚を追加しました`);
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const update = (key: string, phase: PhotoPhase) =>
    onChange(photos.map((p) => (p.key === key ? { ...p, phase } : p)));

  const remove = (key: string) => {
    const target = photos.find((p) => p.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter((p) => p.key !== key));
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className={cn(
          "flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-sm font-semibold text-primary transition hover:bg-primary/10",
          processing && "pointer-events-none opacity-60",
        )}
      >
        {processing ? <Loader2Icon className="size-5 animate-spin" aria-hidden /> : <CameraIcon className="size-5" aria-hidden />}
        {processing ? "写真を処理中…" : "写真を撮る / 選ぶ"}
        <span className="font-normal text-primary/70">（{photos.length}/{MAX_PICKED_PHOTOS}）</span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.key} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="選択した写真" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(photo.key)}
                  className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="この写真を外す"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1.5" role="radiogroup" aria-label="撮影区分">
                {PHOTO_PHASES.map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    role="radio"
                    aria-checked={photo.phase === phase}
                    onClick={() => update(photo.key, phase)}
                    className={cn(
                      "h-9 rounded-md text-xs font-medium transition",
                      photo.phase === phase ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {PHOTO_PHASE_LABELS[phase]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
