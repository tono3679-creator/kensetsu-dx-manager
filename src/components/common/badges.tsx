import type { ReactNode } from "react";

import {
  CONSTRUCTION_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_TONES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  ROLE_LABELS,
  type Tone,
} from "@/lib/constants";
import { TONE_CLASSES, TONE_DOT_CLASSES } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { AppRole, ConstructionType, EmploymentStatus, ProjectStatus } from "@/types/domain";

export function ToneBadge({
  tone,
  children,
  dot = false,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT_CLASSES[tone])} /> : null}
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <ToneBadge tone={PROJECT_STATUS_TONES[status]} dot className={className}>
      {PROJECT_STATUS_LABELS[status]}
    </ToneBadge>
  );
}

export function RoleBadge({ role }: { role: AppRole }) {
  const tone: Tone = role === "admin" ? "violet" : role === "manager" ? "blue" : "gray";
  return <ToneBadge tone={tone}>{ROLE_LABELS[role]}</ToneBadge>;
}

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  return (
    <ToneBadge tone={EMPLOYMENT_STATUS_TONES[status]} dot>
      {EMPLOYMENT_STATUS_LABELS[status]}
    </ToneBadge>
  );
}

export function ConstructionTypeLabel({ type }: { type: ConstructionType }) {
  return <span className="whitespace-nowrap text-muted-foreground">{CONSTRUCTION_TYPE_LABELS[type]}</span>;
}
