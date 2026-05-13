/**
 * 이상형 ↔ 본인 4 항목 매칭 비교 함수 단위 테스트.
 *
 * 결정 로그: docs/decisions/009-v2-self-traits.md §D1·§D4 + 후속 영향 §"TDD 게이트"
 *
 * ## 배경
 *
 * 이상형 enum (any/non_smoker_only/...) ↔ 본인 enum (non_smoker/occasional/regular/...)
 * 셋이 의미상 다르고 카디널리티도 다름 (smoking 이상형 2단계 vs 본인 3단계).
 * 따라서 기존 `compareIdealValues` 만으로는 의도를 표현하기 어렵고, 4 항목 전용
 * 매칭 함수가 필요. 운영자 비교 뷰 `ideal-match-section.tsx` 에서 호출.
 *
 * ## 가정한 함수 시그니처 (worker 가 채울 위치)
 *
 *   // lib/db/self-trait-match.ts (또는 lib/db/ideals.ts 확장)
 *   export type SelfTraitMatchKind = "same" | "partial" | "different" | "neutral";
 *
 *   export function compareSelfTrait(args: {
 *     idealValue: string | null;       // 이상형 enum (any/non_smoker_only 등)
 *     profileValue: string | null;     // 본인 프로필 enum (non_smoker/occasional/regular 등)
 *     kind: "smoking" | "drinking" | "marriage_view" | "tattoo";
 *   }): SelfTraitMatchKind;
 *
 * ## 매트릭스 (009 §D1 정신 + Lead 자율 경계 결정)
 *
 * - "any" 또는 양쪽 null → neutral (단서 없음)
 * - 이상형이 자기 enum 1개를 정확히 매칭 → same
 * - 카디널리티 다른 enum (drinking sometimes_only / marriage 4×3 / tattoo small_ok)
 *   에서 "허용 범위 안에 들지만 완벽 일치 아님" → partial
 * - 그 외 → different
 *
 * ### smoking 매트릭스 (이상형 2 × 본인 3 = 6)
 *
 *   ideal\profile | non_smoker | occasional | regular
 *   any            | neutral    | neutral    | neutral
 *   non_smoker_only| same       | different  | different
 *
 * ### drinking 매트릭스 (이상형 4 × 본인 3 = 12)
 *
 *   ideal\profile     | non_drinker | sometimes | often
 *   any               | neutral     | neutral   | neutral
 *   non_drinker_only  | same        | different | different
 *   sometimes_only    | partial     | same      | different
 *   often_ok          | same        | same      | same
 *
 * ### marriage_view 매트릭스 (이상형 4 × 본인 3 = 12)
 *
 *   ideal\profile  | within_2y | over_3y | dating_focus
 *   any            | neutral   | neutral | neutral
 *   within_2y      | same      | partial | different
 *   over_3y        | partial   | same    | partial
 *   dating_focus   | different | partial | same
 *
 * ### tattoo 매트릭스 (이상형 3 × 본인 3 = 9)
 *
 *   ideal\profile | none | small     | large
 *   any           | neutral | neutral | neutral
 *   none_only     | same | different | different
 *   small_ok      | same | same      | different
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 미작성 — lib/db/self-trait-match.ts (또는 lib/db/ideals.ts 확장)
import { compareSelfTrait } from "@/lib/db/self-trait-match";

describe("compareSelfTrait — neutral 공통 분기 (any / null)", () => {
  it("이상형이 'any' 면 본인 값과 무관하게 neutral", () => {
    expect(
      compareSelfTrait({
        idealValue: "any",
        profileValue: "non_smoker",
        kind: "smoking",
      }),
    ).toBe("neutral");
    expect(
      compareSelfTrait({
        idealValue: "any",
        profileValue: "often",
        kind: "drinking",
      }),
    ).toBe("neutral");
    expect(
      compareSelfTrait({
        idealValue: "any",
        profileValue: "dating_focus",
        kind: "marriage_view",
      }),
    ).toBe("neutral");
    expect(
      compareSelfTrait({
        idealValue: "any",
        profileValue: "large",
        kind: "tattoo",
      }),
    ).toBe("neutral");
  });

  it("이상형이 null 이면 neutral (이상형 미설정)", () => {
    expect(
      compareSelfTrait({
        idealValue: null,
        profileValue: "non_smoker",
        kind: "smoking",
      }),
    ).toBe("neutral");
  });

  it("본인 프로필이 null 이면 neutral (상대 미응답 — 단서 없음)", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_smoker_only",
        profileValue: null,
        kind: "smoking",
      }),
    ).toBe("neutral");
  });

  it("양쪽 다 null 이면 neutral", () => {
    expect(
      compareSelfTrait({
        idealValue: null,
        profileValue: null,
        kind: "marriage_view",
      }),
    ).toBe("neutral");
  });
});

describe("compareSelfTrait — smoking (이상형 2단계 × 본인 3단계)", () => {
  it("non_smoker_only + non_smoker → same (정확 매칭)", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_smoker_only",
        profileValue: "non_smoker",
        kind: "smoking",
      }),
    ).toBe("same");
  });

  it("non_smoker_only + occasional → different (가끔도 흡연자)", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_smoker_only",
        profileValue: "occasional",
        kind: "smoking",
      }),
    ).toBe("different");
  });

  it("non_smoker_only + regular → different", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_smoker_only",
        profileValue: "regular",
        kind: "smoking",
      }),
    ).toBe("different");
  });
});

describe("compareSelfTrait — drinking (이상형 4단계 × 본인 3단계)", () => {
  it("non_drinker_only + non_drinker → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_drinker_only",
        profileValue: "non_drinker",
        kind: "drinking",
      }),
    ).toBe("same");
  });

  it("non_drinker_only + sometimes → different", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_drinker_only",
        profileValue: "sometimes",
        kind: "drinking",
      }),
    ).toBe("different");
  });

  it("non_drinker_only + often → different", () => {
    expect(
      compareSelfTrait({
        idealValue: "non_drinker_only",
        profileValue: "often",
        kind: "drinking",
      }),
    ).toBe("different");
  });

  it("sometimes_only + non_drinker → partial (안 마시면 그래도 OK)", () => {
    expect(
      compareSelfTrait({
        idealValue: "sometimes_only",
        profileValue: "non_drinker",
        kind: "drinking",
      }),
    ).toBe("partial");
  });

  it("sometimes_only + sometimes → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "sometimes_only",
        profileValue: "sometimes",
        kind: "drinking",
      }),
    ).toBe("same");
  });

  it("sometimes_only + often → different (자주 마시면 over)", () => {
    expect(
      compareSelfTrait({
        idealValue: "sometimes_only",
        profileValue: "often",
        kind: "drinking",
      }),
    ).toBe("different");
  });

  it("often_ok + non_drinker → same (다 OK)", () => {
    expect(
      compareSelfTrait({
        idealValue: "often_ok",
        profileValue: "non_drinker",
        kind: "drinking",
      }),
    ).toBe("same");
  });

  it("often_ok + sometimes → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "often_ok",
        profileValue: "sometimes",
        kind: "drinking",
      }),
    ).toBe("same");
  });

  it("often_ok + often → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "often_ok",
        profileValue: "often",
        kind: "drinking",
      }),
    ).toBe("same");
  });
});

describe("compareSelfTrait — marriage_view (이상형 4단계 × 본인 3단계)", () => {
  it("within_2y + within_2y → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "within_2y",
        profileValue: "within_2y",
        kind: "marriage_view",
      }),
    ).toBe("same");
  });

  it("within_2y + over_3y → partial (결혼 의지는 있음, 시점만 어긋)", () => {
    expect(
      compareSelfTrait({
        idealValue: "within_2y",
        profileValue: "over_3y",
        kind: "marriage_view",
      }),
    ).toBe("partial");
  });

  it("within_2y + dating_focus → different (결혼 의지 ↔ 연애 위주)", () => {
    expect(
      compareSelfTrait({
        idealValue: "within_2y",
        profileValue: "dating_focus",
        kind: "marriage_view",
      }),
    ).toBe("different");
  });

  it("over_3y + within_2y → partial (역방향 — 시점 어긋만)", () => {
    expect(
      compareSelfTrait({
        idealValue: "over_3y",
        profileValue: "within_2y",
        kind: "marriage_view",
      }),
    ).toBe("partial");
  });

  it("over_3y + over_3y → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "over_3y",
        profileValue: "over_3y",
        kind: "marriage_view",
      }),
    ).toBe("same");
  });

  it("over_3y + dating_focus → partial (천천히 결혼 ↔ 연애 위주 — 결혼 비중 차이만)", () => {
    expect(
      compareSelfTrait({
        idealValue: "over_3y",
        profileValue: "dating_focus",
        kind: "marriage_view",
      }),
    ).toBe("partial");
  });

  it("dating_focus + within_2y → different (연애 위주 ↔ 빠른 결혼)", () => {
    expect(
      compareSelfTrait({
        idealValue: "dating_focus",
        profileValue: "within_2y",
        kind: "marriage_view",
      }),
    ).toBe("different");
  });

  it("dating_focus + over_3y → partial", () => {
    expect(
      compareSelfTrait({
        idealValue: "dating_focus",
        profileValue: "over_3y",
        kind: "marriage_view",
      }),
    ).toBe("partial");
  });

  it("dating_focus + dating_focus → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "dating_focus",
        profileValue: "dating_focus",
        kind: "marriage_view",
      }),
    ).toBe("same");
  });
});

describe("compareSelfTrait — tattoo (이상형 3단계 × 본인 3단계)", () => {
  it("none_only + none → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "none_only",
        profileValue: "none",
        kind: "tattoo",
      }),
    ).toBe("same");
  });

  it("none_only + small → different", () => {
    expect(
      compareSelfTrait({
        idealValue: "none_only",
        profileValue: "small",
        kind: "tattoo",
      }),
    ).toBe("different");
  });

  it("none_only + large → different", () => {
    expect(
      compareSelfTrait({
        idealValue: "none_only",
        profileValue: "large",
        kind: "tattoo",
      }),
    ).toBe("different");
  });

  it("small_ok + none → same (없음도 OK 범위)", () => {
    expect(
      compareSelfTrait({
        idealValue: "small_ok",
        profileValue: "none",
        kind: "tattoo",
      }),
    ).toBe("same");
  });

  it("small_ok + small → same", () => {
    expect(
      compareSelfTrait({
        idealValue: "small_ok",
        profileValue: "small",
        kind: "tattoo",
      }),
    ).toBe("same");
  });

  it("small_ok + large → different (큰·여러 개는 over)", () => {
    expect(
      compareSelfTrait({
        idealValue: "small_ok",
        profileValue: "large",
        kind: "tattoo",
      }),
    ).toBe("different");
  });
});
