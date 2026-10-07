"use client";

import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialActionResult } from "@/lib/validation/common";
import { uploadProjectPhotosAction } from "@/server/actions/photos";

import { PhotoPicker, appendPhotos, type PickedPhoto } from "./photo-picker";

export function PhotoUploadDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const formData = new FormData();
    appendPhotos(formData, photos);
    startTransition(async () => {
      const result = await uploadProjectPhotosAction(projectId, initialActionResult, formData);
      if (!result.ok) {
        toast.error(result.message ?? "写真の登録に失敗しました");
        return;
      }
      toast.success(result.message ?? "写真を登録しました");
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <ImagePlusIcon aria-hidden />
          写真を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>現場写真を追加</DialogTitle>
          <DialogDescription>撮影区分（施工前・施工中・施工後）を選んで登録してください。</DialogDescription>
        </DialogHeader>
        <PhotoPicker photos={photos} onChange={setPhotos} />
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button size="lg" onClick={submit} disabled={pending || photos.length === 0}>
            {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            {pending ? "アップロード中…" : `${photos.length}枚を登録`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
