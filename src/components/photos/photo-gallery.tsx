import { ImageIcon } from "lucide-react";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { EmptyState } from "@/components/common/empty-state";
import { PHOTO_PHASE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { CurrentUser } from "@/server/auth/session";
import { deletePhotoAction } from "@/server/actions/photos";
import type { PhotoRow } from "@/server/queries/projects";
import { PHOTO_PHASES } from "@/types/domain";

import { PhotoThumb } from "./photo-thumb";
import { PhotoUploadDialog } from "./photo-upload-dialog";

/** 案件の現場写真（施工前・施工中・施工後ごと） */
export function PhotoGallery({ photos, user, projectId }: { photos: PhotoRow[]; user: CurrentUser; projectId: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="num font-semibold text-foreground">{photos.length}</span> 枚の写真
        </p>
        <PhotoUploadDialog projectId={projectId} />
      </div>
      {photos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="写真はまだありません"
          description="施工前・施工中・施工後の写真を登録すると、報告書や引き渡し時の説明に活用できます。"
        />
      ) : (
        PHOTO_PHASES.map((phase) => {
          const items = photos.filter((p) => p.phase === phase);
          if (!items.length) return null;
          return (
            <section key={phase} className="space-y-2">
              <h3 className="text-sm font-semibold">
                {PHOTO_PHASE_LABELS[phase]} <span className="font-normal text-muted-foreground">（{items.length}）</span>
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((photo) => (
                  <li key={photo.id} className="space-y-1">
                    <PhotoThumb photo={photo} />
                    <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                      <span className="num truncate">
                        {formatDate(photo.createdAt)} ・ {photo.uploadedByName ?? "—"}
                      </span>
                      {user.role === "admin" || photo.uploadedBy === user.employeeId ? (
                        <ConfirmActionButton
                          iconOnly
                          action={deletePhotoAction.bind(null, photo.id)}
                          title="この写真を削除しますか？"
                          description="削除した写真は元に戻せません。"
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
