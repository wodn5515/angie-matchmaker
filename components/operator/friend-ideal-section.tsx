import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  PERSONALITY_KEYWORD_LABEL,
  PRIORITY_CATEGORY_LABEL,
  REGION_LABEL,
  JOB_LABEL,
  SMOKING_LABEL,
  DRINKING_LABEL,
  MARRIAGE_TIMING_LABEL,
  TATTOO_LABEL,
} from "@/lib/types/v2-options";

/**
 * `/friends/[id]` 의 "이상형" 섹션.
 * PRD §3.2 / §3.3.3 — §1 선호 8 + §2 성격·결 + §3 우선순위.
 *
 * worker 가 friend_ideals + 1:N 테이블을 fetch 해서 props 로 주입.
 * 데이터 없으면 EmptyState 가 아닌 "(미작성)" placeholder 텍스트.
 */
export type FriendIdealSummary = {
  // §1
  age_from: number | null;
  age_to: number | null;
  regions: string[]; // RegionCode 값들
  hometowns: string[];
  hometown_same_bonus: boolean;
  smoking: string | null;
  drinking: string | null;
  marriage_timing: string | null;
  jobs: string[];
  tattoo: string | null;
  // §2
  personality_keywords: string[];
  free_text: string | null;
  // §3
  priorities: string[]; // 길이 0~3, 앞이 1순위
};

export function FriendIdealSection({
  ideal,
}: {
  ideal: FriendIdealSummary | null;
}) {
  if (!ideal) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 px-5 py-6 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          이상형이 아직 작성되지 않았어요.
        </p>
      </section>
    );
  }

  const ageText =
    ideal.age_from || ideal.age_to
      ? `${ideal.age_from ?? "—"}년생 ~ ${ideal.age_to ?? "—"}년생`
      : "상관없음";

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      {/* §1 선호 조건 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          §1 선호 조건
        </h3>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          <Row label="나이대" value={ageText} />
          <Row
            label="거주지역"
            value={
              ideal.regions.length === 0
                ? "상관없음"
                : ideal.regions.map((r) => REGION_LABEL[r] ?? r).join(", ")
            }
          />
          <Row
            label="출신지역"
            value={
              ideal.hometowns.length === 0
                ? "상관없음"
                : `${ideal.hometowns.map((r) => REGION_LABEL[r] ?? r).join(", ")}${ideal.hometown_same_bonus ? " · 같은 출신 가산" : ""}`
            }
          />
          <Row
            label="흡연"
            value={ideal.smoking ? SMOKING_LABEL[ideal.smoking] : "—"}
          />
          <Row
            label="음주"
            value={ideal.drinking ? DRINKING_LABEL[ideal.drinking] : "—"}
          />
          <Row
            label="결혼관"
            value={
              ideal.marriage_timing
                ? MARRIAGE_TIMING_LABEL[ideal.marriage_timing]
                : "—"
            }
          />
          <Row
            label="문신"
            value={ideal.tattoo ? TATTOO_LABEL[ideal.tattoo] : "—"}
          />
          <Row
            label="직업군"
            value={
              ideal.jobs.length === 0
                ? "상관없음"
                : ideal.jobs.map((j) => JOB_LABEL[j] ?? j).join(", ")
            }
          />
        </dl>
      </div>

      {/* §2 성격·결 */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          §2 성격·결
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ideal.personality_keywords.length === 0 ? (
            <span className="text-xs text-[var(--color-fg-subtle)]">
              키워드 선택 없음
            </span>
          ) : (
            ideal.personality_keywords.map((k) => (
              <Badge key={k} variant="pink">
                {PERSONALITY_KEYWORD_LABEL[k] ?? k}
              </Badge>
            ))
          )}
        </div>
        {ideal.free_text ? (
          <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2 text-xs leading-relaxed text-fg whitespace-pre-wrap">
            {ideal.free_text}
          </p>
        ) : null}
      </div>

      {/* §3 우선순위 */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          §3 매칭 우선순위
        </h3>
        <ol className="mt-2 flex flex-wrap gap-2">
          {ideal.priorities.length === 0 ? (
            <span className="text-xs text-[var(--color-fg-subtle)]">
              우선순위 선택 없음
            </span>
          ) : (
            ideal.priorities.map((cat, i) => (
              <li
                key={cat}
                className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/5 px-2.5 py-1 text-xs"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-fg">
                  {PRIORITY_CATEGORY_LABEL[cat] ?? cat}
                </span>
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)]/40 py-1 last:border-b-0">
      <dt className="text-[var(--color-fg-muted)]">{label}</dt>
      <dd className="truncate text-right text-fg">{value}</dd>
    </div>
  );
}
