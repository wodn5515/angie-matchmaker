"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 두 native <input type="range"> 를 from/to 로 묶어 출생연도 범위 같은 from~to 폼에 사용.
 * PRD §3.3.3 §1 선호 나이대 (출생연도 from~to).
 *
 * 단순함 우선: 시각적으로 두 슬라이더가 겹쳐 보이는 dual-track 효과는 생략하고,
 * label + 두 슬라이더 + numeric input 옆에 표시.
 */
export type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  valueFrom: number | null;
  valueTo: number | null;
  onChange: (from: number | null, to: number | null) => void;
  /** form 제출용 name prefix — `${name}_from`, `${name}_to` hidden input 으로 직렬화 */
  name?: string;
  labelFrom?: string;
  labelTo?: string;
  formatValue?: (v: number) => string;
  className?: string;
};

export function RangeSlider({
  min,
  max,
  step = 1,
  valueFrom,
  valueTo,
  onChange,
  name,
  labelFrom = "From",
  labelTo = "To",
  formatValue,
  className,
}: RangeSliderProps) {
  const fmt = formatValue ?? ((v: number) => String(v));
  const fromText = valueFrom != null ? fmt(valueFrom) : "—";
  const toText = valueTo != null ? fmt(valueTo) : "—";

  const onFromChange = (raw: string) => {
    const v = raw === "" ? null : Number(raw);
    onChange(v, valueTo);
  };
  const onToChange = (raw: string) => {
    const v = raw === "" ? null : Number(raw);
    onChange(valueFrom, v);
  };

  return (
    <div className={cn("space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3", className)}>
      <div className="flex items-center justify-between text-[11px] text-[var(--color-fg-muted)]">
        <span>
          {labelFrom}: <span className="text-fg">{fromText}</span>
        </span>
        <span>
          {labelTo}: <span className="text-fg">{toText}</span>
        </span>
      </div>
      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueFrom ?? min}
          onChange={(e) => onFromChange(e.target.value)}
          aria-label={labelFrom}
          className="w-full accent-[var(--color-pink-500)]"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueTo ?? max}
          onChange={(e) => onToChange(e.target.value)}
          aria-label={labelTo}
          className="w-full accent-[var(--color-pink-500)]"
        />
      </div>
      {name ? (
        <>
          <input
            type="hidden"
            name={`${name}_from`}
            value={valueFrom ?? ""}
          />
          <input type="hidden" name={`${name}_to`} value={valueTo ?? ""} />
        </>
      ) : null}
    </div>
  );
}
