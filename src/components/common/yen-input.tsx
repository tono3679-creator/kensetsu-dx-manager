"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const formatter = new Intl.NumberFormat("ja-JP");

export function parseYenInput(value: string): number | null {
  const normalized = value.replace(/[,\s円¥￥]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

/** 金額入力（3桁カンマで表示し、数字キーボードを開く） */
export function YenInput({
  name,
  id,
  defaultValue,
  onValueChange,
  invalid,
  placeholder = "0",
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(defaultValue === null || defaultValue === undefined ? "" : formatter.format(defaultValue));

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setText(e.target.value);
          onValueChange?.(parseYenInput(e.target.value));
        }}
        onBlur={() => {
          const value = parseYenInput(text);
          if (value !== null) setText(formatter.format(value));
        }}
        className="num pr-8 text-right"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">円</span>
    </div>
  );
}
