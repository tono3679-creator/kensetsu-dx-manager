"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/validation/common";

/** 確認ダイアログ付きで Server Action（削除など）を実行するボタン */
export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel = "削除する",
  trigger,
  iconOnly = false,
}: {
  action: () => Promise<ActionResult | void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  trigger?: ReactNode;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        toast.error(result.message ?? "処理に失敗しました");
        return;
      }
      if (result?.message) toast.success(result.message);
      setOpen(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size={iconOnly ? "icon" : "sm"}
            className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label={title}
          >
            <Trash2Icon aria-hidden />
            {iconOnly ? null : "削除"}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run();
            }}
            disabled={pending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
