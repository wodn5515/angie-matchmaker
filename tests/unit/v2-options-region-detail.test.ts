/**
 * lib/types/v2-options.ts — REGION_DETAIL_OPTIONS + getRegionFullLabel
 * 2단계 세분화 옵션 사전 단위 테스트.
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D3·§D6
 *
 * ## 배경
 *
 * 거주/출신 지역을 한 단계 더 내려가 광역시→구 / 도→시 단위까지 입력 가능하게 한다.
 * 세종특별자치시는 세분화 없음 (빈 배열).
 *
 * ## worker 가 채울 인터페이스 (lib/types/v2-options.ts)
 *
 *   export const REGION_DETAIL_OPTIONS: Record<RegionCode, ReadonlyArray<{value:string,label:string}>>;
 *
 *   /\**
 *    * 광역 region 코드 + detail 코드 → "서울 강남구" 같은 결합 한글 라벨.
 *    * - region 이 null/undefined/빈 → ""
 *    * - detail 이 null/undefined/빈 → 광역 라벨만
 *    * - detail 이 존재하지만 매핑 미스 → 광역 라벨만 (raw fallback)
 *    *\/
 *   export function getRegionFullLabel(
 *     region: string | null | undefined,
 *     detail: string | null | undefined,
 *   ): string;
 *
 *   export function getHometownFullLabel(...): string; // 동일 패턴
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 미작성 — REGION_DETAIL_OPTIONS / getRegionFullLabel / getHometownFullLabel
import {
  REGION_DETAIL_OPTIONS,
  getRegionFullLabel,
  getHometownFullLabel,
} from "@/lib/types/v2-options";

const METRO_REGIONS = [
  "seoul",
  "busan",
  "incheon",
  "daegu",
  "daejeon",
  "gwangju",
  "ulsan",
] as const;

const PROVINCE_REGIONS = [
  "gyeonggi",
  "gangwon",
  "chungbuk",
  "chungnam",
  "jeonbuk",
  "jeonnam",
  "gyeongbuk",
  "gyeongnam",
  "jeju",
] as const;

describe("REGION_DETAIL_OPTIONS — 광역시·도 detail 옵션 사전", () => {
  it("객체 형태로 export 된다", () => {
    expect(REGION_DETAIL_OPTIONS).toBeDefined();
    expect(typeof REGION_DETAIL_OPTIONS).toBe("object");
  });

  describe("광역시 7개 — 자치구 단위 (D3 단위 표준)", () => {
    for (const region of METRO_REGIONS) {
      it(`${region} 의 detail 배열 길이 > 0`, () => {
        const arr = REGION_DETAIL_OPTIONS[region];
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      });
    }
  });

  describe("도 9개 (제주 포함) — 시·군 단위 (D3 단위 표준)", () => {
    for (const region of PROVINCE_REGIONS) {
      it(`${region} 의 detail 배열 길이 > 0`, () => {
        const arr = REGION_DETAIL_OPTIONS[region];
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      });
    }
  });

  describe("세종 — 특별자치시라 세분화 없음", () => {
    it("sejong detail 배열은 빈 배열이다", () => {
      const arr = REGION_DETAIL_OPTIONS["sejong"];
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);
    });
  });

  describe("value 컨벤션 — slug-case (영어 lowercase + '-')", () => {
    // D3 — "gangnam-gu", "suwon-si", "gangneung-si" 등.
    const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const region of [...METRO_REGIONS, ...PROVINCE_REGIONS]) {
      it(`${region} 의 detail value 들이 모두 slug-case 정규식을 만족한다`, () => {
        const arr = REGION_DETAIL_OPTIONS[region] as ReadonlyArray<{
          value: string;
          label: string;
        }>;
        expect(arr.length).toBeGreaterThan(0);
        for (const entry of arr) {
          expect(entry.value).toMatch(SLUG_RE);
          // label 은 한글이 들어가야 자연 — 빈문자열 금지
          expect(entry.label.length).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("서울 강남구 sample — 알려진 항목 존재성 (D3 단위 표준 sanity)", () => {
    it("seoul detail 안에 'gangnam-gu' value 가 존재한다", () => {
      const arr = REGION_DETAIL_OPTIONS["seoul"] as ReadonlyArray<{
        value: string;
        label: string;
      }>;
      const entry = arr.find((d) => d.value === "gangnam-gu");
      expect(entry).toBeDefined();
      // label 은 "강남구" 가 자연 (D3 컨벤션) — 한글 라벨 존재만 검증, 정확 일치는
      // 강요 안 함 (worker 마이크로 조정 여지 + getRegionFullLabel 통해 검증)
      expect(entry?.label).toMatch(/강남/);
    });
  });
});

describe("getRegionFullLabel — region + detail 결합 라벨", () => {
  it("결합: ('seoul', 'gangnam-gu') → '서울 강남구'", () => {
    expect(getRegionFullLabel("seoul", "gangnam-gu")).toBe("서울 강남구");
  });

  it("detail 빈 문자열: ('seoul', '') → '서울'", () => {
    expect(getRegionFullLabel("seoul", "")).toBe("서울");
  });

  it("detail null: ('seoul', null) → '서울'", () => {
    expect(getRegionFullLabel("seoul", null)).toBe("서울");
  });

  it("detail undefined: ('seoul', undefined) → '서울'", () => {
    expect(getRegionFullLabel("seoul", undefined)).toBe("서울");
  });

  it("region null: (null, 'gangnam-gu') → '' (region 없으면 항상 빈)", () => {
    expect(getRegionFullLabel(null, "gangnam-gu")).toBe("");
  });

  it("region undefined: (undefined, anything) → ''", () => {
    expect(getRegionFullLabel(undefined, "gangnam-gu")).toBe("");
  });

  it("region 빈문자열: ('', 'gangnam-gu') → ''", () => {
    expect(getRegionFullLabel("", "gangnam-gu")).toBe("");
  });

  it("detail 매핑 미스: ('seoul', 'nonexistent') → '서울' (광역만, raw fallback)", () => {
    // D3 의 명세: 매핑 미스 시 detail 무시하고 광역 라벨만 반환.
    expect(getRegionFullLabel("seoul", "nonexistent-detail")).toBe("서울");
  });

  it("세종 — ('sejong', '') → '세종' (detail 옵션 없는 광역도 정상 라벨)", () => {
    expect(getRegionFullLabel("sejong", "")).toBe("세종");
  });
});

describe("getHometownFullLabel — region 사전 공유 (광역시도 17개)", () => {
  // D6 — hometown 도 동일 패턴, 사전 공유.
  it("('busan', 'haeundae-gu') → '부산 해운대구' (sample — REGION_DETAIL_OPTIONS.busan 안에 haeundae-gu 존재 가정)", () => {
    const arr = REGION_DETAIL_OPTIONS["busan"] as ReadonlyArray<{
      value: string;
      label: string;
    }>;
    const has = arr.some((d) => d.value === "haeundae-gu");
    // D3 단위 표준 sanity — 부산 자치구 16개 중 해운대구 포함.
    expect(has).toBe(true);
    expect(getHometownFullLabel("busan", "haeundae-gu")).toBe("부산 해운대구");
  });

  it("('gyeonggi', null) → '경기' (광역만)", () => {
    expect(getHometownFullLabel("gyeonggi", null)).toBe("경기");
  });

  it("(null, anything) → ''", () => {
    expect(getHometownFullLabel(null, "anything")).toBe("");
  });

  it("매핑 미스: ('gyeonggi', 'nonexistent') → '경기' (raw fallback)", () => {
    expect(getHometownFullLabel("gyeonggi", "nonexistent")).toBe("경기");
  });
});
