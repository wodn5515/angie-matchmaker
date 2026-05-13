"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  REGION_OPTIONS,
  REGION_DETAIL_OPTIONS,
  type RegionDetailValue,
  type RegionCode,
} from "@/lib/types/v2-options";

/**
 * 거주/출신 지역 2단계 multi-select 프리미티브 (012 §D5 + 디자이너 게이트).
 *
 * - 헤더 17개 (광역시·도). 각 행은 <details>/<summary> Accordion.
 * - summary 클릭 → 그 region 의 "전체" 토글 + 네이티브 expand (디자이너 게이트):
 *     - 현재 "none" / "partial" → "전체" 로 (그 region 의 detail 들 자동 해제,
 *       `(region, '')` 한 행 저장)
 *     - 현재 "all" → "none" 으로 (그 region 의 모든 행 삭제)
 * - 펼친 본문에 detail 체크박스. 체크 시 그 region 의 "전체" 자동 해제
 *   (D5 상호 배타). detail 체크 시 N 행 `(region, detail)` 저장.
 * - 세종 (detail 옵션 0개): <details> 없이 단순 토글 버튼. summary 와 동일한
 *   accessible name 형식 "세종 전체" 으로 통일.
 * - 직렬화: hidden input `name="<name>" value="region|detail"` (1행 1input).
 *
 * 컨트롤드 전용 — value / onValueChange.
 */
export type RegionDetailPickerProps = {
  /** form submit 시 hidden input 의 name (예: "regions" / "hometowns"). */
  name: string;
  /** 현재 선택값 (컨트롤드). */
  value: RegionDetailValue[];
  /** 사용자 토글마다 호출 (next 값 전달). */
  onValueChange?: (next: RegionDetailValue[]) => void;
  /** value 가 0개일 때 노출할 안내 텍스트 (디자이너 게이트). */
  emptyHint?: string;
  className?: string;
};

type RegionState = "none" | "all" | "partial";

function getRegionState(
  value: RegionDetailValue[],
  region: string,
): RegionState {
  const rows = value.filter((v) => v.region === region);
  if (rows.length === 0) return "none";
  if (rows.some((r) => r.detail === "")) return "all";
  return "partial";
}

function getSelectedDetails(
  value: RegionDetailValue[],
  region: string,
): Set<string> {
  return new Set(
    value
      .filter((v) => v.region === region && v.detail !== "")
      .map((v) => v.detail),
  );
}

export function RegionDetailPicker({
  name,
  value,
  onValueChange,
  emptyHint,
  className,
}: RegionDetailPickerProps) {
  const emit = (next: RegionDetailValue[]) => {
    onValueChange?.(next);
  };

  // 헤더 (summary 또는 세종 토글) 클릭 — 그 region 의 "전체" 토글 (D5).
  const toggleRegionAll = (region: string) => {
    const state = getRegionState(value, region);
    const others = value.filter((v) => v.region !== region);
    if (state === "all") {
      emit(others);
    } else {
      emit([...others, { region, detail: "" }]);
    }
  };

  // detail 체크박스 클릭 — 그 region 의 "전체" 자동 해제 + detail 토글.
  const toggleRegionDetail = (region: string, detail: string) => {
    const others = value.filter((v) => v.region !== region);
    const regionRows = value.filter((v) => v.region === region);
    const hasAll = regionRows.some((r) => r.detail === "");
    // 상호 배타: hasAll 이면 baseDetails 는 빈 셋부터 시작 (전체 해제 + detail 만 보존).
    const baseDetails = new Set(
      regionRows
        .filter((r) => !hasAll && r.detail !== "")
        .map((r) => r.detail),
    );
    if (baseDetails.has(detail)) {
      baseDetails.delete(detail);
    } else {
      baseDetails.add(detail);
    }
    const nextRegionRows: RegionDetailValue[] = Array.from(baseDetails).map(
      (d) => ({ region, detail: d }),
    );
    emit([...others, ...nextRegionRows]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value.length === 0 && emptyHint ? (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{emptyHint}</p>
      ) : null}

      <div className="space-y-1.5">
        {REGION_OPTIONS.map((o) => {
          const region = o.value as RegionCode;
          const detailOptions = REGION_DETAIL_OPTIONS[region];
          const state = getRegionState(value, region);
          const selectedDetails = getSelectedDetails(value, region);
          const hasDetailOptions = detailOptions.length > 0;
          return (
            <RegionRow
              key={region}
              regionLabel={o.label}
              regionValue={region}
              state={state}
              hasDetailOptions={hasDetailOptions}
              detailOptions={detailOptions}
              selectedDetails={selectedDetails}
              onToggleAll={() => toggleRegionAll(region)}
              onToggleDetail={(detail) => toggleRegionDetail(region, detail)}
            />
          );
        })}
      </div>

      {/* form submit hidden inputs — 1 행 1 input ("region|detail" 결합) */}
      {value.map((v, i) => (
        <input
          key={`${v.region}|${v.detail}|${i}`}
          type="hidden"
          name={name}
          value={`${v.region}|${v.detail}`}
        />
      ))}
    </div>
  );
}

function RegionRow({
  regionLabel,
  regionValue,
  state,
  hasDetailOptions,
  detailOptions,
  selectedDetails,
  onToggleAll,
  onToggleDetail,
}: {
  regionLabel: string;
  regionValue: RegionCode;
  state: RegionState;
  hasDetailOptions: boolean;
  detailOptions: ReadonlyArray<{ value: string; label: string }>;
  selectedDetails: Set<string>;
  onToggleAll: () => void;
  onToggleDetail: (detail: string) => void;
}) {
  const tint = state === "none" ? "" : "bg-pink-500/8";

  // accessible name 통일: "{regionLabel} 전체" — 모든 region 의 header 가 같은 형식.
  // → getByRole(button, /서울/) 와 getByRole(button, /서울.*전체|전체.*서울/) 둘 다
  //   이 한 header 에 매칭된다.
  const headerLabel = `${regionLabel} 전체`;

  if (!hasDetailOptions) {
    // 세종 — <details> 없이 단순 토글 버튼.
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--color-border)] px-3 py-2",
          tint,
        )}
      >
        <button
          type="button"
          onClick={onToggleAll}
          aria-pressed={state === "all"}
          className="flex w-full items-center justify-between gap-2 text-sm"
        >
          <span className="text-fg">{headerLabel}</span>
          <StatusBadge state={state} count={selectedDetails.size} />
        </button>
      </div>
    );
  }

  // 일반 region — <details>/<summary> Accordion.
  // summary 클릭은 (1) 네이티브 expand 와 (2) onToggleAll 양쪽을 같이 일으킨다 —
  // 디자이너 게이트가 합의한 동작. (단일 click 으로 펼치며 동시에 "전체" 토글.)
  return (
    <details
      className={cn(
        "group rounded-lg border border-[var(--color-border)] open:border-pink-500/30 px-3 py-2",
        tint,
      )}
    >
      <summary
        // jsdom 환경에서 <summary> 의 implicit role=button 이 누락되는 경우가 있어
        // 명시적으로 role+aria-pressed 부여. 네이티브 expand 는 그대로 유지.
        role="button"
        aria-pressed={state === "all"}
        aria-label={headerLabel}
        onClick={() => {
          // preventDefault 하지 않음 — 네이티브 expand 가 동작해야 함.
          onToggleAll();
        }}
        className="flex cursor-pointer items-center justify-between gap-2 text-sm marker:hidden [&::-webkit-details-marker]:hidden"
      >
        <span className="text-fg">{headerLabel}</span>
        <span className="flex items-center gap-2">
          <StatusBadge state={state} count={selectedDetails.size} />
          <span
            aria-hidden
            className="text-[10px] text-[var(--color-fg-subtle)] transition group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {detailOptions.map((d) => {
          const id = `${regionValue}-${d.value}`;
          const checked = selectedDetails.has(d.value);
          return (
            <label
              key={d.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition",
                checked
                  ? "border-pink-500/60 bg-pink-500/10 text-pink-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:border-pink-500/30 hover:text-fg",
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => onToggleDetail(d.value)}
                className="h-3.5 w-3.5 accent-[var(--color-pink-500)]"
              />
              <span>{d.label}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

function StatusBadge({ state, count }: { state: RegionState; count: number }) {
  if (state === "all") {
    return (
      <span className="rounded-full border border-pink-500/60 bg-pink-500/15 px-2 py-0.5 text-[10px] text-pink-200">
        ✓
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] text-[var(--color-fg-muted)]">
        {count}개
      </span>
    );
  }
  return null;
}

