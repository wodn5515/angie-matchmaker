/**
 * 본인 프로필 4 항목 (smoking/drinking/marriage_view/tattoo) 라벨 helper 단위 테스트.
 *
 * 결정 로그: docs/decisions/009-v2-self-traits.md §D5
 *
 * ## 배경
 *
 * 009 §D5 — 이상형 라벨 (SMOKING_LABEL 등 — `lib/types/v2-options.ts`) 은 "상관없음"
 * 포함 enum 셋이지만, 본인 프로필은 자기 상태 표현이라 enum 셋이 다름.
 * 따라서 008 의 `makeLabelGetter` 패턴을 재사용해 4 helper 신규 추가:
 *
 *   export function getSmokingLabel(value: string | null | undefined): string;
 *   export function getDrinkingLabel(value: string | null | undefined): string;
 *   export function getMarriageViewLabel(value: string | null | undefined): string;
 *   export function getTattooLabel(value: string | null | undefined): string;
 *
 * 한글 라벨 (009 §D5 본문):
 *   - smoking:        비흡연 / 가끔 핀다 / 자주 핀다
 *   - drinking:       안 마심 / 가끔 / 자주
 *   - marriage_view:  1~2년 내 결혼 / 3년 이후 결혼 / 연애 위주
 *   - tattoo:         없음 / 작은 것 / 큰·여러 개
 *
 * Fallback (008 패턴 동일):
 *   - 매핑에 없는 값 → raw value 그대로 (정보 누락 방지)
 *   - null / undefined / 빈 문자열 → 빈 문자열
 */

import { describe, expect, it } from "vitest";
import {
  // @ts-expect-error worker 미작성
  getSmokingLabel,
  // @ts-expect-error worker 미작성
  getDrinkingLabel,
  // @ts-expect-error worker 미작성
  getMarriageViewLabel,
  // @ts-expect-error worker 미작성
  getTattooLabel,
} from "@/lib/types/v2-options";

describe("getSmokingLabel — 본인 흡연 코드 → 한글 라벨", () => {
  it("'non_smoker' → '비흡연'", () => {
    expect(getSmokingLabel("non_smoker")).toBe("비흡연");
  });

  it("'occasional' → '가끔 핀다'", () => {
    expect(getSmokingLabel("occasional")).toBe("가끔 핀다");
  });

  it("'regular' → '자주 핀다' (enum 끝단 검증)", () => {
    expect(getSmokingLabel("regular")).toBe("자주 핀다");
  });

  it("매핑에 없는 값은 raw value 그대로 반환 (fallback)", () => {
    expect(getSmokingLabel("unknown_value")).toBe("unknown_value");
  });

  it("null / undefined / 빈 문자열은 빈 문자열 반환", () => {
    expect(getSmokingLabel(null)).toBe("");
    expect(getSmokingLabel(undefined)).toBe("");
    expect(getSmokingLabel("")).toBe("");
  });

  it("이상형 enum (non_smoker_only) 은 본인 라벨에서 raw fallback", () => {
    // 이상형 enum 셋 ↔ 본인 enum 셋 분리 — 본인 helper 가 실수로 이상형 라벨을
    // 노출하면 운영자 디테일 화면에 의미가 잘못 표시됨. raw value 로 fallback 돼야 정합.
    expect(getSmokingLabel("non_smoker_only")).toBe("non_smoker_only");
  });
});

describe("getDrinkingLabel — 본인 음주 코드 → 한글 라벨", () => {
  it("'non_drinker' → '안 마심'", () => {
    expect(getDrinkingLabel("non_drinker")).toBe("안 마심");
  });

  it("'sometimes' → '가끔'", () => {
    expect(getDrinkingLabel("sometimes")).toBe("가끔");
  });

  it("'often' → '자주' (enum 끝단 검증)", () => {
    expect(getDrinkingLabel("often")).toBe("자주");
  });

  it("매핑에 없는 값은 raw value 그대로 반환", () => {
    expect(getDrinkingLabel("unknown_drinking")).toBe("unknown_drinking");
  });

  it("null / undefined 는 빈 문자열 반환", () => {
    expect(getDrinkingLabel(null)).toBe("");
    expect(getDrinkingLabel(undefined)).toBe("");
  });
});

describe("getMarriageViewLabel — 본인 결혼관 코드 → 한글 라벨", () => {
  it("'within_2y' → '1~2년 내 결혼'", () => {
    expect(getMarriageViewLabel("within_2y")).toBe("1~2년 내 결혼");
  });

  it("'over_3y' → '3년 이후 결혼'", () => {
    expect(getMarriageViewLabel("over_3y")).toBe("3년 이후 결혼");
  });

  it("'dating_focus' → '연애 위주' (enum 끝단 검증)", () => {
    expect(getMarriageViewLabel("dating_focus")).toBe("연애 위주");
  });

  it("매핑에 없는 값은 raw value 그대로 반환", () => {
    expect(getMarriageViewLabel("unknown_view")).toBe("unknown_view");
  });

  it("null / undefined 는 빈 문자열 반환", () => {
    expect(getMarriageViewLabel(null)).toBe("");
    expect(getMarriageViewLabel(undefined)).toBe("");
  });
});

describe("getTattooLabel — 본인 문신 코드 → 한글 라벨", () => {
  it("'none' → '없음'", () => {
    expect(getTattooLabel("none")).toBe("없음");
  });

  it("'small' → '작은 것'", () => {
    expect(getTattooLabel("small")).toBe("작은 것");
  });

  it("'large' → '큰·여러 개' (enum 끝단 검증)", () => {
    expect(getTattooLabel("large")).toBe("큰·여러 개");
  });

  it("매핑에 없는 값은 raw value 그대로 반환", () => {
    expect(getTattooLabel("unknown_tattoo")).toBe("unknown_tattoo");
  });

  it("null / undefined 는 빈 문자열 반환", () => {
    expect(getTattooLabel(null)).toBe("");
    expect(getTattooLabel(undefined)).toBe("");
  });

  it("이상형 enum (none_only) 는 본인 라벨에서 raw fallback", () => {
    // 본인 tattoo 셋은 none/small/large, 이상형은 none_only/small_ok/any —
    // 분리 명확히. helper 가 이상형 값을 받으면 의미 누락 fallback.
    expect(getTattooLabel("none_only")).toBe("none_only");
  });
});
