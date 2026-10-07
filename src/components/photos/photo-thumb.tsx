import { PHOTO_PHASE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PhotoPhase } from "@/types/domain";

const PHASE_CLASSES: Record<PhotoPhase, string> = {
  before: "bg-slate-800/80",
  during: "bg-blue-700/85",
  after: "bg-emerald-700/85",
};

/**
 * 現場写真のサムネイル。画像は認可付きの Route Handler（/api/photos/:id）から配信する。
 * 元画像はクライアント側で圧縮済みのため next/image の最適化は使わない。
 */
export function PhotoThumb({
  photo,
  size = "md",
  className,
}: {
  photo: { id: string; phase: PhotoPhase; caption: string | null };
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <a
      href={`/api/photos/${photo.id}`}
      target="_blank"
      rel="noopener"
      className={cn(
        "group relative block shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10",
        size === "sm" ? "h-20 w-28" : "aspect-[4/3] w-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${photo.id}`}
        alt={photo.caption ?? PHOTO_PHASE_LABELS[photo.phase]}
        loading="lazy"
        className="size-full object-cover transition group-hover:scale-[1.03]"
      />
      <span
        className={cn(
          "absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white",
          PHASE_CLASSES[photo.phase],
        )}
      >
        {PHOTO_PHASE_LABELS[photo.phase]}
      </span>
      {size === "md" && photo.caption ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-xs text-white">
          {photo.caption}
        </span>
      ) : null}
    </a>
  );
}
