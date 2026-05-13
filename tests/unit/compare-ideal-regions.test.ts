/**
 * compareIdealRegions / compareIdealHometowns — 2단계 (region + detail) 매칭 비교.
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D4
 *
 * ## 배경
 *
 * 기존 `compareIdealValues({ kind: "multi" })` 는 region 단일값 multi-select 만 다룬다.
 * 2단계 (region, detail) 비교는 별도 함수가 의미 표현이 깔끔.
 *
 * ## worker 가 채울 인터페이스
 *
 *   // lib/db/ideals.ts (또는 동일 디렉토리)
 *   export type RegionPref  = { region: string; detail: string };       // detail '' 가능
 *   export type SelfRegion  = { region: string | null; detail: string | null };
 *
 *   export function compareIdealRegions(args: {
 *     ideal: RegionPref[];
 *     self: SelfRegion;
 *   }): IdealMatchKind;
 *
 *   export function compareIdealHometowns(...): IdealMatchKind; // 같은 시그니처
 *
 * ## 매칭 규칙 (D4)
 *
 * - ideal 빈 배열 또는 self.region null → neutral
 * - ideal 행이 (region == self.region && detail == '') 면 → same (광역 전체 선호 + 본인이 그 광역)
 * - ideal 행이 (region == self.region && detail == self.detail) 면 → same
 * - region 일치하지만 detail 미일치 (self.detail 다르거나 self.detail null) → partial
 * - 모든 ideal 행과 region 불일치 → different
 * - 다중 행: 최고 일치 등급 반환 (same > partial > different)
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 미작성 — compareIdealRegions / compareIdealHometowns
import {
  compareIdealRegions,
  compareIdealHometowns,
} from "@/lib/db/ideals";

describe("compareIdealRegions — 광역 전체 선호 vs 본인", () => {
  it("ideal=[{seoul,''}] + self={seoul,gangnam-gu} → same (서울 전체 선호 + 본인이 서울)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("same");
  });

  it("ideal=[{seoul,''}] + self={busan,haeundae-gu} → different (광역도 다름)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: "busan", detail: "haeundae-gu" },
      }),
    ).toBe("different");
  });

  it("ideal=[{seoul,''}] + self={seoul,null} → same (광역만 알면 충분)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: "seoul", detail: null },
      }),
    ).toBe("same");
  });
});

describe("compareIdealRegions — 특정 detail 선호", () => {
  it("ideal=[{seoul,gangnam-gu}] + self={seoul,gangnam-gu} → same", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "gangnam-gu" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("same");
  });

  it("ideal=[{seoul,seocho-gu}] + self={seoul,gangnam-gu} → partial (region 일치 + detail 불일치)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "seocho-gu" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("partial");
  });

  it("ideal=[{seoul,seocho-gu}] + self={seoul,null} → partial (self detail 불명 — 보수적)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "seocho-gu" }],
        self: { region: "seoul", detail: null },
      }),
    ).toBe("partial");
  });

  it("ideal=[{seoul,gangnam-gu}] + self={busan,haeundae-gu} → different (광역 불일치)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "gangnam-gu" }],
        self: { region: "busan", detail: "haeundae-gu" },
      }),
    ).toBe("different");
  });
});

describe("compareIdealRegions — neutral 분기", () => {
  it("ideal 빈 배열 → neutral (선호 미설정)", () => {
    expect(
      compareIdealRegions({
        ideal: [],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("neutral");
  });

  it("self.region null → neutral (본인 미응답)", () => {
    expect(
      compareIdealRegions({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: null, detail: null },
      }),
    ).toBe("neutral");
  });

  it("self.region null + ideal 다중 → neutral", () => {
    expect(
      compareIdealRegions({
        ideal: [
          { region: "seoul", detail: "gangnam-gu" },
          { region: "busan", detail: "" },
        ],
        self: { region: null, detail: null },
      }),
    ).toBe("neutral");
  });
});

describe("compareIdealRegions — 다중 ideal 행 best match", () => {
  // D4 — 행 중 하나라도 same 이면 same > partial > different
  it("ideal=[{seoul,gangnam-gu}, {busan,''}] + self={busan,suyeong-gu} → same (busan 전체 매칭)", () => {
    expect(
      compareIdealRegions({
        ideal: [
          { region: "seoul", detail: "gangnam-gu" },
          { region: "busan", detail: "" },
        ],
        self: { region: "busan", detail: "suyeong-gu" },
      }),
    ).toBe("same");
  });

  it("ideal=[{seoul,seocho-gu}, {busan,haeundae-gu}] + self={seoul,gangnam-gu} → partial (서울만 region 일치)", () => {
    expect(
      compareIdealRegions({
        ideal: [
          { region: "seoul", detail: "seocho-gu" },
          { region: "busan", detail: "haeundae-gu" },
        ],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("partial");
  });

  it("ideal=[{busan,haeundae-gu}, {gyeonggi,''}] + self={seoul,gangnam-gu} → different (어느 행도 region 불일치)", () => {
    expect(
      compareIdealRegions({
        ideal: [
          { region: "busan", detail: "haeundae-gu" },
          { region: "gyeonggi", detail: "" },
        ],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("different");
  });

  it("ideal=[{seoul,''}, {seoul,gangnam-gu}] + self={seoul,seocho-gu} → same (광역 전체 행이 우위)", () => {
    // 상호 배타 정책상 실제로는 (seoul,'') 와 (seoul,'gangnam-gu') 가 함께 저장되진
    // 않지만, 비교 함수는 들어온 입력 그대로 best match 반환을 보장해야 한다.
    expect(
      compareIdealRegions({
        ideal: [
          { region: "seoul", detail: "" },
          { region: "seoul", detail: "gangnam-gu" },
        ],
        self: { region: "seoul", detail: "seocho-gu" },
      }),
    ).toBe("same");
  });
});

describe("compareIdealHometowns — 동일 동작 구조 (D4 후속)", () => {
  it("ideal=[{seoul,''}] + self={seoul,gangnam-gu} → same", () => {
    expect(
      compareIdealHometowns({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("same");
  });

  it("ideal=[{seoul,seocho-gu}] + self={seoul,gangnam-gu} → partial", () => {
    expect(
      compareIdealHometowns({
        ideal: [{ region: "seoul", detail: "seocho-gu" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("partial");
  });

  it("ideal=[{busan,''}] + self={seoul,gangnam-gu} → different", () => {
    expect(
      compareIdealHometowns({
        ideal: [{ region: "busan", detail: "" }],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("different");
  });

  it("ideal=[] → neutral", () => {
    expect(
      compareIdealHometowns({
        ideal: [],
        self: { region: "seoul", detail: "gangnam-gu" },
      }),
    ).toBe("neutral");
  });

  it("self.region null → neutral", () => {
    expect(
      compareIdealHometowns({
        ideal: [{ region: "seoul", detail: "" }],
        self: { region: null, detail: null },
      }),
    ).toBe("neutral");
  });
});
