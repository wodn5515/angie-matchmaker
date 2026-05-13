"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 다중 선택 칩 그리드.
 * PRD §3.3.3 §1 선호 거주지역/출신지역/직업군, §2 성격 키워드 15개에 사용.
 *
 * 비제어 + 제어 둘 다 지원. value/onValueChange 가 둘 다 주어지면 제어 모드.
 * 모바일 자연 줄바꿈, 각 칩은 토글 동작.
 */
export type ChipOption = {
  value: string;
  label: string;
  description?: string;
};

export function MultiSelectChip({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  max,
  className,
  emptyHint,
}: {
  options: ChipOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (next: string[]) => void;
  /** form submit 시 hidden input 으로 직렬화. 각 선택 값마다 name 동일하게 multiple 으로 전달. */
  name?: string;
  /** 최대 선택 개수 (예: 우선순위 top3 후보용으로는 따로 RankingPicker 사용) */
  max?: number;
  className?: string;
  emptyHint?: string;
}) {
  const [internal, setInternal] = React.useState<string[]>(defaultValue ?? []);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as string[]) : internal;

  const setNext = (next: string[]) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const toggle = (v: string) => {
    if (current.includes(v)) {
      setNext(current.filter((x) => x !== v));
      return;
    }
    if (typeof max === "number" && current.length >= max) return;
    setNext([...current, v]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggle(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                selected
                  ? "border-pink-500/60 bg-pink-500/15 text-pink-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:border-pink-500/30 hover:text-fg",
              )}
              title={opt.description}
            >
              <span>{opt.label}</span>
              {selected ? <span className="text-pink-300">✓</span> : null}
            </button>
          );
        })}
      </div>
      {current.length === 0 && emptyHint ? (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{emptyHint}</p>
      ) : null}
      {typeof max === "number" ? (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          {current.length}/{max} 선택
        </p>
      ) : null}
      {/* form 제출용 hidden inputs — value 별 1개씩 */}
      {name
        ? current.map((v) => (
            <input key={v} type="hidden" name={name} value={v} />
          ))
        : null}
    </div>
  );
}
