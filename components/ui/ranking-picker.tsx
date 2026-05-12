"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 6개 카테고리 중 top 3 를 1·2·3 순위로 선택.
 * PRD §3.3.3 §3 매칭 우선순위 (외모/성격/안정성/결혼관/가치관/라이프스타일).
 *
 * UX: 카테고리 카드를 탭하면 다음 빈 순위(1→2→3)에 자동 배정.
 *      이미 배정된 카드를 다시 탭하면 해제. 1·2·3 순위 뱃지를 카드에 표시.
 *
 * 비제어 + 제어 모두 지원. value 는 길이 0~3 의 카테고리 배열 (앞이 1순위).
 * form 직렬화 시 `${name}_rank_1`, `_rank_2`, `_rank_3` hidden input 으로 전달.
 */
export type RankingOption = {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
};

export function RankingPicker({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
}: {
  options: RankingOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (next: string[]) => void;
  name?: string;
  className?: string;
}) {
  const [internal, setInternal] = React.useState<string[]>(defaultValue ?? []);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as string[]) : internal;
  const setNext = (next: string[]) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const toggle = (v: string) => {
    const idx = current.indexOf(v);
    if (idx >= 0) {
      // 해제
      setNext(current.filter((x) => x !== v));
      return;
    }
    if (current.length >= 3) return; // 이미 3개 채워짐
    setNext([...current, v]);
  };

  const rankOf = (v: string) => {
    const idx = current.indexOf(v);
    return idx < 0 ? null : idx + 1;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const rank = rankOf(opt.value);
          const selected = rank != null;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={selected}
              className={cn(
                "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                selected
                  ? "border-pink-500/60 bg-pink-500/10 pink-soft-glow"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-pink-500/30",
              )}
            >
              {selected ? (
                <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] font-bold text-white">
                  {rank}
                </span>
              ) : null}
              <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
                {opt.emoji ? <span>{opt.emoji}</span> : null}
                <span>{opt.label}</span>
              </div>
              {opt.description ? (
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  {opt.description}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        {current.length}/3 순위 — 가장 중요한 3개를 순서대로 골라줘
      </p>
      {name ? (
        <>
          <input type="hidden" name={`${name}_rank_1`} value={current[0] ?? ""} />
          <input type="hidden" name={`${name}_rank_2`} value={current[1] ?? ""} />
          <input type="hidden" name={`${name}_rank_3`} value={current[2] ?? ""} />
        </>
      ) : null}
    </div>
  );
}
