import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 비교 뷰의 "이상형 매칭 — 양방향" 행.
 * PRD §3.4.2 — A의 이상형 ↔ B의 프로필 / B의 이상형 ↔ A의 프로필.
 *
 * 한 행에 다음을 보여준다:
 *   - 항목 라벨 (예: "선호 거주지역", "흡연", "결혼관")
 *   - 좌측: A의 ideal 값 / 우측: B의 actual 값 (또는 그 반대)
 *   - matchTone 에 따라 셀 배경 색상 단서 (✅/⚠️/❌/·)
 *
 * matchTone 판정 자체는 worker 의 비교 로직 책임. 디자이너는 표시만.
 */
export type MatchTone = "same" | "partial" | "different" | "neutral";

const TONE_ICON: Record<MatchTone, string> = {
  same: "✅",
  partial: "⚠️",
  different: "❌",
  neutral: "·",
};

const TONE_CLASS: Record<MatchTone, string> = {
  same: "match-cell-same",
  partial: "match-cell-partial",
  different: "match-cell-different",
  neutral: "match-cell-neutral",
};

export function IdealMatchRow({
  label,
  idealText,
  actualText,
  tone,
  className,
}: {
  label: string;
  idealText: React.ReactNode;
  actualText: React.ReactNode;
  tone: MatchTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-lg border px-3 py-2 text-xs sm:grid-cols-[1fr_2rem_1fr]",
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
          이상형
        </p>
        <p className="mt-0.5 truncate text-fg" title={String(idealText ?? "")}>
          {idealText ?? "—"}
        </p>
      </div>
      <div
        className="flex items-center justify-center text-base"
        aria-label={tone}
        title={label}
      >
        {TONE_ICON[tone]}
      </div>
      <div className="min-w-0 text-right">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
          상대 프로필
        </p>
        <p className="mt-0.5 truncate text-fg" title={String(actualText ?? "")}>
          {actualText ?? "—"}
        </p>
      </div>
      <div className="col-span-3 -mt-1 text-[10px] text-[var(--color-fg-subtle)]">
        {label}
      </div>
    </div>
  );
}

/**
 * 한 방향(예: A의 ideal ↔ B의 profile) 의 매칭 행들을 모아 보여주는 카드 패널.
 */
export function IdealMatchPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="space-y-2 px-4 py-3">{children}</div>
    </section>
  );
}
