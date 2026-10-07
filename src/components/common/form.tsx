"use client";

import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { initialActionResult, type ActionResult } from "@/lib/validation/common";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, required, hint, errors, children, className }: FormFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-1 rounded bg-red-50 px-1 text-[10px] font-semibold text-red-600">必須</span>
        ) : null}
      </Label>
      {children}
      {errors?.length ? (
        <p id={errorId} className="flex items-center gap-1 text-xs text-red-600" role="alert">
          <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden />
          {errors[0]}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  pendingLabel?: string;
  /** onSubmit 経由で送信する場合は送信中フラグを明示的に渡す */
  pending?: boolean;
}

/** 送信中はスピナーを表示し二重送信を防ぐ */
export function SubmitButton({ children, pendingLabel = "保存中…", disabled, pending: pendingProp, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** フォーム全体のエラーメッセージ */
export function FormErrorMessage({ state }: { state: ActionResult }) {
  if (state.ok || !state.message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}

/**
 * Server Action を onSubmit から実行するフォーム用フック。
 * React 19 の <form action> は完了時に入力をリセットするため、
 * 検証エラー時に入力内容を保持したいフォームではこちらを使う。
 */
export function useActionForm(
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
  prepare?: (formData: FormData) => void,
) {
  const [state, dispatch, pending] = useActionState(action, initialActionResult);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    prepare?.(formData);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending };
}

/** Server Action の結果をトーストで通知する */
export function useActionToast(state: ActionResult, options: { onSuccess?: () => void } = {}) {
  const previous = useRef(state);
  const { onSuccess } = options;
  useEffect(() => {
    if (state === previous.current) return;
    previous.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);
}
