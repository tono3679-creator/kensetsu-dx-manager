"use client";

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { FormErrorMessage, FormField, SubmitButton, useActionForm } from "@/components/common/form";
import { PhotoPicker, appendPhotos, type PickedPhoto } from "@/components/photos/photo-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation/common";
import type { ProjectOption } from "@/server/queries/common";
import type { DailyReport, DailyReportWorker } from "@/server/queries/daily-reports";

const BREAK_OPTIONS = [0, 30, 45, 60, 75, 90, 120];
const QUICK_PHRASES = ["資材搬入・養生", "既設撤去", "配線・配管作業", "器具取付", "試運転・検査", "清掃・片付け"];

interface MaterialLine {
  key: string;
  name: string;
  quantity: string;
  unit: string;
}

function Block({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/8 md:p-5", className)}>
      {title ? <h2 className="text-sm font-bold text-muted-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}

export function DailyReportForm({
  action,
  projects,
  workerMap,
  currentEmployeeId,
  today,
  defaultProjectId,
  defaultDate,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  projects: ProjectOption[];
  workerMap: Record<string, DailyReportWorker[]>;
  currentEmployeeId: string;
  today: string;
  defaultProjectId?: string;
  defaultDate?: string;
  initial?: DailyReport;
  submitLabel: string;
  cancelHref: string;
}) {
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const { state, onSubmit, pending } = useActionForm(action, (formData) => appendPhotos(formData, photos));
  const errors = state.fieldErrors ?? {};

  const [projectId, setProjectId] = useState(initial?.projectId ?? defaultProjectId ?? (projects.length === 1 ? projects[0].id : ""));
  const [workerIds, setWorkerIds] = useState<string[]>(initial?.workers.map((w) => w.employeeId) ?? [currentEmployeeId]);
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [content, setContent] = useState(initial?.workContent ?? "");
  const [materials, setMaterials] = useState<MaterialLine[]>(
    initial?.materials.map((m) => ({ key: m.id, name: m.name, quantity: String(m.quantity), unit: m.unit ?? "" })) ?? [],
  );

  const workers = useMemo(() => {
    const list = [...(workerMap[projectId] ?? [])];
    // 案件メンバー以外が選択済みの場合（応援など）も表示する
    for (const w of initial?.workers ?? []) if (!list.some((x) => x.employeeId === w.employeeId)) list.push(w);
    return list;
  }, [workerMap, projectId, initial]);

  const toggleWorker = (id: string) =>
    setWorkerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const addMaterial = () =>
    setMaterials((rows) => [...rows, { key: crypto.randomUUID(), name: "", quantity: "", unit: "" }]);
  const updateMaterial = (key: string, patch: Partial<MaterialLine>) =>
    setMaterials((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormErrorMessage state={state} />

      <Block>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="日付" htmlFor="reportDate" required errors={errors.reportDate}>
            <Input id="reportDate" name="reportDate" type="date" max={today} defaultValue={initial?.reportDate ?? defaultDate ?? today} className="h-12 text-base md:h-10" />
          </FormField>
          <FormField label="案件（現場）" htmlFor="projectId" required errors={errors.projectId}>
            <NativeSelect
              id="projectId"
              name="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-invalid={!!errors.projectId}
            >
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="開始" htmlFor="startTime" required errors={errors.startTime}>
            <Input id="startTime" name="startTime" type="time" defaultValue={initial?.startTime.slice(0, 5) ?? "08:00"} className="num" />
          </FormField>
          <FormField label="終了" htmlFor="endTime" required errors={errors.endTime}>
            <Input id="endTime" name="endTime" type="time" defaultValue={initial?.endTime.slice(0, 5) ?? "17:00"} className="num" aria-invalid={!!errors.endTime} />
          </FormField>
          <FormField label="休憩" htmlFor="breakMinutes" errors={errors.breakMinutes}>
            <NativeSelect id="breakMinutes" name="breakMinutes" defaultValue={String(initial?.breakMinutes ?? 60)}>
              {BREAK_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}分
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </Block>

      <Block title="作業者">
        {workers.length ? (
          <div className="flex flex-wrap gap-2">
            {workers.map((w) => {
              const checked = workerIds.includes(w.employeeId);
              return (
                <label
                  key={w.employeeId}
                  className={cn(
                    "flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition select-none",
                    checked ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleWorker(w.employeeId)} />
                  {w.name}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">案件を選ぶと作業者の候補が表示されます。</p>
        )}
        {workerIds.map((id) => (
          <input key={id} type="hidden" name="workerIds" value={id} />
        ))}
      </Block>

      <Block title="作業内容・進捗">
        <FormField label="作業内容" htmlFor="workContent" required errors={errors.workContent}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setContent((c) => (c ? `${c}\n${phrase}` : phrase))}
                className="h-8 rounded-full border bg-background px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                ＋{phrase}
              </button>
            ))}
          </div>
          <Textarea
            id="workContent"
            name="workContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="例）2階 共用廊下の照明器具取付（12台）、結線まで完了"
            aria-invalid={!!errors.workContent}
          />
        </FormField>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="progress" className="text-sm font-medium">
              作業進捗
            </label>
            <span className="num text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <input
            id="progress"
            name="progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="h-8 w-full accent-[var(--primary)]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" className="flex-1" aria-label="進捗を10%下げる" onClick={() => setProgress((p) => Math.max(0, p - 10))}>
              <MinusIcon aria-hidden />
              10%
            </Button>
            <Button type="button" variant="outline" size="lg" className="flex-1" aria-label="進捗を10%上げる" onClick={() => setProgress((p) => Math.min(100, p + 10))}>
              <PlusIcon aria-hidden />
              10%
            </Button>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setProgress(100)}>
              完了
            </Button>
          </div>
        </div>
      </Block>

      <Block title="使用材料">
        {errors.materials ? <p className="text-xs text-red-600">{errors.materials[0]}</p> : null}
        {materials.length ? (
          <ul className="space-y-2">
            {materials.map((m, i) => (
              <li key={m.key} className="grid grid-cols-[1fr_5rem_3.5rem_auto] items-center gap-2">
                <Input name="materialNames" value={m.name} onChange={(e) => updateMaterial(m.key, { name: e.target.value })} placeholder={`材料名 ${i + 1}`} maxLength={100} aria-label={`材料名 ${i + 1}`} />
                <Input name="materialQuantities" value={m.quantity} onChange={(e) => updateMaterial(m.key, { quantity: e.target.value })} inputMode="decimal" placeholder="数量" className="num text-right" aria-label={`数量 ${i + 1}`} />
                <Input name="materialUnits" value={m.unit} onChange={(e) => updateMaterial(m.key, { unit: e.target.value })} placeholder="単位" maxLength={10} aria-label={`単位 ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon-lg" onClick={() => setMaterials((rows) => rows.filter((r) => r.key !== m.key))} aria-label={`${i + 1}行目を削除`}>
                  <Trash2Icon aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={addMaterial}>
          <PlusIcon aria-hidden />
          材料を追加
        </Button>
      </Block>

      <Block title="写真">
        <PhotoPicker photos={photos} onChange={setPhotos} />
        {initial?.photos.length ? (
          <p className="text-xs text-muted-foreground">登録済みの写真 {initial.photos.length} 枚（削除は案件詳細の「写真」タブから行えます）</p>
        ) : null}
      </Block>

      <Block title="その他">
        <FormField label="問題・トラブル" htmlFor="issues" errors={errors.issues} hint="入力すると管理者・現場責任者の確認対象になります">
          <Textarea id="issues" name="issues" defaultValue={initial?.issues ?? ""} rows={2} maxLength={2000} placeholder="なし" />
        </FormField>
        <FormField label="明日の予定" htmlFor="tomorrowPlan" errors={errors.tomorrowPlan}>
          <Textarea id="tomorrowPlan" name="tomorrowPlan" defaultValue={initial?.tomorrowPlan ?? ""} rows={2} maxLength={2000} />
        </FormField>
        <FormField label="備考" htmlFor="notes" errors={errors.notes}>
          <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={2} maxLength={2000} />
        </FormField>
      </Block>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Button asChild variant="outline" size="xl" className="flex-1 md:h-10 md:flex-none md:text-sm">
          <Link href={cancelHref}>キャンセル</Link>
        </Button>
        <SubmitButton pending={pending} size="xl" className="flex-[2] md:h-10 md:flex-none md:px-8 md:text-sm" pendingLabel="送信中…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
