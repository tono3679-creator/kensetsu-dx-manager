"use client";

import { ArrowRightIcon, HardHatIcon, ShieldCheckIcon, UserCogIcon } from "lucide-react";
import { useRef } from "react";

import { FormErrorMessage, SubmitButton, useActionForm } from "@/components/common/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABELS } from "@/lib/constants";
import { loginAction } from "@/server/actions/auth";
import type { AppRole } from "@/types/domain";

const ROLE_ICONS: Record<AppRole, typeof ShieldCheckIcon> = {
  admin: ShieldCheckIcon,
  manager: UserCogIcon,
  staff: HardHatIcon,
};

export function LoginForm({ next, showDemoAccounts }: { next?: string; showDemoAccounts: boolean }) {
  const { state, onSubmit, pending } = useActionForm(loginAction);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const loginAs = (email: string) => {
    if (!emailRef.current || !passwordRef.current) return;
    emailRef.current.value = email;
    passwordRef.current.value = DEMO_PASSWORD;
    formRef.current?.requestSubmit();
  };

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="name@example.com"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード</Label>
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11"
          />
        </div>
        <FormErrorMessage state={state} />
        <SubmitButton pending={pending} size="xl" className="w-full" pendingLabel="ログイン中…">
          ログイン
        </SubmitButton>
      </form>

      {showDemoAccounts ? (
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          デモアカウントでログイン
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = ROLE_ICONS[account.role];
            return (
              <button
                key={account.email}
                type="button"
                onClick={() => loginAs(account.email)}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {ROLE_LABELS[account.role]}
                    <span className="font-normal text-muted-foreground">{account.name}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{account.description}</span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          パスワードはすべて <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code>
        </p>
      </div>
      ) : null}
    </div>
  );
}
