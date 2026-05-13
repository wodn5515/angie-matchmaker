import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 온보딩 multi-step 진행 표시.
 * 가입자 측 (가입자-shell) 페이지 헤더에서 1/2/3 step 위치를 시각화.
 *
 * 점 + 라벨 + 진행 bar 조합. 모바일 360px 에서도 가로 정렬 유지.
 */
export type StepperStep = {
  label: string;
  optional?: boolean;
};

export function Stepper({
  steps,
  currentIndex,
  className,
}: {
  steps: StepperStep[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-start justify-between gap-2">
        {steps.map((step, i) => {
          const state =
            i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
          return (
            <li
              key={step.label}
              className="flex flex-1 flex-col items-center text-center"
            >
              <div
                aria-current={state === "active" ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition",
                  state === "done" &&
                    "border-pink-500 bg-pink-500 text-white",
                  state === "active" &&
                    "border-pink-500 bg-pink-500/20 text-pink-300 pink-soft-glow",
                  state === "todo" &&
                    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-subtle)]",
                )}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <div className="mt-1.5 text-[10px] leading-tight">
                <p
                  className={cn(
                    "font-medium",
                    state === "todo"
                      ? "text-[var(--color-fg-subtle)]"
                      : "text-fg",
                  )}
                >
                  {step.label}
                </p>
                {step.optional ? (
                  <p className="text-[9px] text-[var(--color-fg-subtle)]">
                    선택
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all"
          style={{
            width: `${steps.length === 0 ? 0 : ((Math.min(currentIndex, steps.length - 1) + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
