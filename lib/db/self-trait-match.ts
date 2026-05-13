/**
 * 본인 프로필 ↔ 이상형 4 항목 매칭 비교.
 *
 * 결정 로그: docs/decisions/009-v2-self-traits.md §D4 / §S2 / §S3
 *
 * ## 왜 분리?
 *
 * 기존 `compareIdealValues` (lib/db/ideals.ts) 는 "이상형 enum 끝의 `_only` 접미사를
 * 떼면 프로필 enum 과 정확히 일치한다" 는 가정 위에서 single 매칭을 처리한다.
 * 그런데 본인 프로필 4 항목은 카디널리티가 더 세부적이고 (smoking 이상형 2단계 vs 본인
 * 3단계, drinking 4×3, marriage_view 4×3, tattoo 3×3) "허용 범위 안에 있지만 완전
 * 일치는 아님 → partial" 같은 경계가 필요. 따라서 항목별 명시적 매트릭스가
 * 자연스러워서 단일 `compareSelfTrait` 로 표현한다.
 *
 * 매트릭스는 결정 로그 §S3 의 Lead 자율 채택안 그대로:
 *   - "any" 또는 어느 한쪽 null → neutral (단서 없음)
 *   - 이상형이 "본인 enum 1개 = 정확히 그 값" 의미 → same (예: non_smoker_only + non_smoker)
 *   - 이상형이 "허용 범위" 라 본인 값이 그 안에 떨어지면 → same / partial
 *   - 그 외 → different
 */

export type SelfTraitMatchKind = "same" | "partial" | "different" | "neutral";

export type SelfTraitKind = "smoking" | "drinking" | "marriage_view" | "tattoo";

export type CompareSelfTraitArgs = {
  /** 이상형 enum 값 (any/non_smoker_only/... 등). null 이면 미설정. */
  idealValue: string | null;
  /** 본인 프로필 enum 값 (non_smoker/occasional/... 등). null 이면 미응답. */
  profileValue: string | null;
  kind: SelfTraitKind;
};

/**
 * 한 항목의 이상형 ↔ 본인 매칭을 4 분류로 반환.
 *
 * - neutral: 단서 없음 (이상형 any / null, 본인 null)
 * - same:    이상형 의도와 본인 값이 완전 부합
 * - partial: 허용 범위 안이지만 완벽 매치 아님 / 인접 단계
 * - different: 명시적 불일치
 */
export function compareSelfTrait(args: CompareSelfTraitArgs): SelfTraitMatchKind {
  const { idealValue, profileValue, kind } = args;

  // ── 공통 neutral 분기 ────────────────────────────────────────
  if (idealValue == null) return "neutral";
  if (idealValue === "any") return "neutral";
  if (profileValue == null) return "neutral";

  switch (kind) {
    case "smoking":
      return matchSmoking(idealValue, profileValue);
    case "drinking":
      return matchDrinking(idealValue, profileValue);
    case "marriage_view":
      return matchMarriageView(idealValue, profileValue);
    case "tattoo":
      return matchTattoo(idealValue, profileValue);
    default:
      return "neutral";
  }
}

// ── 항목별 매트릭스 ──────────────────────────────────────────────
//
// 가독성 우선 — 작은 switch 로 결정 로그 §S3 의 매트릭스를 그대로 옮긴다.

function matchSmoking(ideal: string, profile: string): SelfTraitMatchKind {
  // 이상형 2단계 (any 는 위에서 처리) × 본인 3단계
  if (ideal === "non_smoker_only") {
    return profile === "non_smoker" ? "same" : "different";
  }
  // 알려지지 않은 이상형 enum (CHECK 우회 / 향후 enum 확장) — 안전 fallback.
  // "different" 로 떨어뜨리면 false-different 가 매칭 판단을 오도하므로 neutral.
  return "neutral";
}

function matchDrinking(ideal: string, profile: string): SelfTraitMatchKind {
  // 이상형 4단계 (any 는 위에서 처리) × 본인 3단계
  if (ideal === "non_drinker_only") {
    return profile === "non_drinker" ? "same" : "different";
  }
  if (ideal === "sometimes_only") {
    if (profile === "sometimes") return "same";
    if (profile === "non_drinker") return "partial"; // 안 마셔도 OK 의도
    return "different"; // often
  }
  if (ideal === "often_ok") {
    // 다 OK — 본인 어떤 값이든 same
    return "same";
  }
  // 알려지지 않은 이상형 enum — 안전 fallback (matchSmoking 과 동일 정신).
  return "neutral";
}

function matchMarriageView(
  ideal: string,
  profile: string,
): SelfTraitMatchKind {
  // 이상형 4단계 (any 는 위에서 처리) × 본인 3단계.
  // 인접 단계 (within_2y↔over_3y, over_3y↔dating_focus) → partial.
  // 양 끝단 (within_2y↔dating_focus) → different.
  if (ideal === profile) return "same";
  const adjacency: Record<string, string[]> = {
    within_2y: ["over_3y"],
    over_3y: ["within_2y", "dating_focus"],
    dating_focus: ["over_3y"],
  };
  const neighbors = adjacency[ideal] ?? [];
  if (neighbors.includes(profile)) return "partial";
  return "different";
}

function matchTattoo(ideal: string, profile: string): SelfTraitMatchKind {
  // 이상형 3단계 (any 는 위에서 처리) × 본인 3단계
  if (ideal === "none_only") {
    return profile === "none" ? "same" : "different";
  }
  if (ideal === "small_ok") {
    // 없음·작은 것 모두 허용 범위 → same. 큰·여러 개는 over.
    if (profile === "none" || profile === "small") return "same";
    return "different";
  }
  // 알려지지 않은 이상형 enum — 안전 fallback (matchSmoking 과 동일 정신).
  return "neutral";
}
