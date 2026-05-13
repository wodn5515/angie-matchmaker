/**
 * 이상형 양방향 비교 단위 테스트 — V2 비교 뷰 핵심 로직.
 *
 * PRD §3.4.2 / §6.5: A 의 이상형 ↔ B 의 프로필 같음/일부/다름/중립(상관없음) 단서.
 *
 * 검증 함수 인터페이스 가정 (worker 가 채울 모듈):
 *
 *   import { compareIdealValues, type IdealMatchKind } from "@/lib/db/ideals";
 *
 *   export type IdealMatchKind = "same" | "partial" | "different" | "neutral";
 *
 *   /\**
 *    * 한 항목의 이상형 값 vs 상대 프로필 값을 비교한다.
 *    *
 *    * - "any" / 빈 배열 / null / undefined → "neutral"
 *    * - 단일 값 == 일치 → "same"
 *    * - 단일 값 다름 → "different"
 *    * - mcq_multi (이상형 = 배열): 전부 포함 → "same" / 일부 포함 → "partial" / 전부 미포함 → "different"
 *    * - 출생연도 범위 (from~to): 안에 들어옴 → "same" / 한쪽만 → "partial" / 밖 → "different"
 *    *\/
 *   function compareIdealValues(args: {
 *     ideal: unknown;          // ideal 값 (any / 단일 / 배열 / 범위)
 *     profile: unknown;        // 상대 프로필 값
 *     kind: "single" | "multi" | "year_range";
 *   }): IdealMatchKind;
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 미작성
import { compareIdealValues } from "@/lib/db/ideals";

describe("compareIdealValues — 이상형 vs 프로필 단방향 비교", () => {
  describe("neutral — 상관없음 / 미응답", () => {
    it("ideal='any' 면 neutral", () => {
      expect(
        compareIdealValues({ ideal: "any", profile: "yes", kind: "single" }),
      ).toBe("neutral");
    });

    it("ideal=null 이면 neutral", () => {
      expect(
        compareIdealValues({ ideal: null, profile: "anything", kind: "single" }),
      ).toBe("neutral");
    });

    it("ideal=빈 배열이면 neutral (multi)", () => {
      expect(
        compareIdealValues({
          ideal: [],
          profile: "seoul",
          kind: "multi",
        }),
      ).toBe("neutral");
    });

    it("profile 값이 없으면 neutral (상대가 미응답)", () => {
      expect(
        compareIdealValues({
          ideal: "non_smoker_only",
          profile: null,
          kind: "single",
        }),
      ).toBe("neutral");
    });
  });

  describe("single — 단일 enum 항목 (흡연/음주/결혼시점관/문신)", () => {
    it("ideal=non_smoker_only + profile=non_smoker → same", () => {
      expect(
        compareIdealValues({
          ideal: "non_smoker_only",
          profile: "non_smoker",
          kind: "single",
        }),
      ).toBe("same");
    });

    it("ideal=non_smoker_only + profile=smoker → different", () => {
      expect(
        compareIdealValues({
          ideal: "non_smoker_only",
          profile: "smoker",
          kind: "single",
        }),
      ).toBe("different");
    });

    it("ideal=within_2y (결혼 1~2년) + profile=within_2y → same", () => {
      expect(
        compareIdealValues({
          ideal: "within_2y",
          profile: "within_2y",
          kind: "single",
        }),
      ).toBe("same");
    });

    it("ideal=within_2y + profile=dating_focus → different", () => {
      expect(
        compareIdealValues({
          ideal: "within_2y",
          profile: "dating_focus",
          kind: "single",
        }),
      ).toBe("different");
    });
  });

  describe("multi — 다중선택 (거주지역/출신지역/직업)", () => {
    it("이상형=[seoul,gyeonggi] + 상대거주=seoul → same (포함됨)", () => {
      expect(
        compareIdealValues({
          ideal: ["seoul", "gyeonggi"],
          profile: "seoul",
          kind: "multi",
        }),
      ).toBe("same");
    });

    it("이상형=[seoul,gyeonggi] + 상대거주=busan → different (미포함)", () => {
      expect(
        compareIdealValues({
          ideal: ["seoul", "gyeonggi"],
          profile: "busan",
          kind: "multi",
        }),
      ).toBe("different");
    });

    it("이상형=[seoul,busan] + 상대 거주가 배열 [seoul,daegu] 일 때 교집합 있음 → partial", () => {
      expect(
        compareIdealValues({
          ideal: ["seoul", "busan"],
          profile: ["seoul", "daegu"],
          kind: "multi",
        }),
      ).toBe("partial");
    });

    it("이상형=[seoul,busan] + 상대 거주가 배열 [seoul,busan] (전부 포함) → same", () => {
      expect(
        compareIdealValues({
          ideal: ["seoul", "busan"],
          profile: ["seoul", "busan"],
          kind: "multi",
        }),
      ).toBe("same");
    });

    it("이상형=[seoul] + 상대 거주가 배열 [daegu,jeju] (교집합 없음) → different", () => {
      expect(
        compareIdealValues({
          ideal: ["seoul"],
          profile: ["daegu", "jeju"],
          kind: "multi",
        }),
      ).toBe("different");
    });
  });

  describe("year_range — 선호 출생연도 from~to vs 상대 birth_year", () => {
    it("범위 내면 same (from=1990, to=1995, profile=1992)", () => {
      expect(
        compareIdealValues({
          ideal: { from: 1990, to: 1995 },
          profile: 1992,
          kind: "year_range",
        }),
      ).toBe("same");
    });

    it("범위 밖이면 different (from=1990, to=1995, profile=1980)", () => {
      expect(
        compareIdealValues({
          ideal: { from: 1990, to: 1995 },
          profile: 1980,
          kind: "year_range",
        }),
      ).toBe("different");
    });

    it("한쪽만 채워진 범위 (from=1990, to=null) + profile=1995 → partial (불완전 매칭)", () => {
      expect(
        compareIdealValues({
          ideal: { from: 1990, to: null },
          profile: 1995,
          kind: "year_range",
        }),
      ).toBe("partial");
    });

    it("from/to 모두 null 이면 neutral (사실상 상관없음)", () => {
      expect(
        compareIdealValues({
          ideal: { from: null, to: null },
          profile: 1992,
          kind: "year_range",
        }),
      ).toBe("neutral");
    });
  });
});
