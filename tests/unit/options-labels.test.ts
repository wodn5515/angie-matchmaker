/**
 * lib/types/v2-options.ts — 옵션 코드 → 한글 라벨 변환 헬퍼 단위 테스트.
 *
 * 결정 로그: docs/decisions/008-v2-routing-display-fixes.md §D3·D4
 *
 * ## 배경
 *
 * 가입자 디테일 (`/friends/[id]`) 은 `REGION_LABEL`, `JOB_LABEL` lookup 으로
 * 한글 라벨 변환됨 (`경기`, `IT·개발`). 가입자 리스트 (`/friends`) 는 raw enum
 * 그대로 표시 (`gyeonggi`, `it_dev`) — 정합성 깨짐.
 *
 * 사용자 보고 (008 §배경):
 *   "가입자 리스트에서 경기도는 왜 gyeonggi 이렇게 영어로 나오고 가입자
 *    디테일에서는 경기 로 잘 나오고 직업은 이상하게 it_dev 이렇게 영어로 나와
 *    이런거 좀 다 한글로 보이게 정합성 맞춰줘"
 *
 * ## 결정
 *
 * 008 §D3·D4 — 라벨 lookup 을 단발 호출하는 helper 함수 (`getRegionLabel`,
 * `getJobLabel`, 등) 를 `lib/types/v2-options.ts` 에 추가하고 페이지에서는 이
 * helper 만 호출하게 한다. (방안 가 — 008 §본문 spec 작성 가이드 참고.)
 *
 * Helper 시그니처:
 *
 *   export function getRegionLabel(value: string | null | undefined): string;
 *   export function getJobLabel(value: string | null | undefined): string;
 *
 * Fallback 동작 — 매핑에 없는 값은 raw value 그대로 (정보 누락 방지). null /
 * undefined / 빈 문자열은 빈 문자열 반환 (UI 에서 "" 처리는 페이지가 ?? 로 책임).
 *
 * 다른 enum (gender, preferred_gender, relationship_status, match_interest 등) 도
 * 기존 LABEL 객체가 이미 있으니 worker 가 같은 패턴으로 helper 추가하면 좋지만,
 * spec 은 region / job 만 강제 (사용자 보고 직접 사례).
 */

import { describe, expect, it } from "vitest";
import { getRegionLabel, getJobLabel } from "@/lib/types/v2-options";

describe("getRegionLabel — region 코드 → 한글 라벨", () => {
  it("'gyeonggi' → '경기' (사용자 보고 직접 사례)", () => {
    expect(getRegionLabel("gyeonggi")).toBe("경기");
  });

  it("'seoul' → '서울'", () => {
    expect(getRegionLabel("seoul")).toBe("서울");
  });

  it("'jeju' → '제주' (광역시도 17개 매핑 끝단 검증)", () => {
    expect(getRegionLabel("jeju")).toBe("제주");
  });

  it("매핑에 없는 값은 raw value 그대로 반환 (fallback — 정보 누락 방지)", () => {
    expect(getRegionLabel("unknown_value")).toBe("unknown_value");
  });

  it("null 은 빈 문자열 반환", () => {
    expect(getRegionLabel(null)).toBe("");
  });

  it("undefined 도 빈 문자열 반환", () => {
    expect(getRegionLabel(undefined)).toBe("");
  });
});

describe("getJobLabel — 직업군 코드 → 한글 라벨", () => {
  it("'it_dev' → 'IT·개발' (사용자 보고 직접 사례)", () => {
    expect(getJobLabel("it_dev")).toBe("IT·개발");
  });

  it("'office' → '사무직'", () => {
    expect(getJobLabel("office")).toBe("사무직");
  });

  it("'etc' → '기타' (직업 대분류 9개 매핑 끝단 검증)", () => {
    expect(getJobLabel("etc")).toBe("기타");
  });

  it("매핑에 없는 값은 raw value 그대로 반환 (fallback)", () => {
    expect(getJobLabel("unknown_job")).toBe("unknown_job");
  });

  it("null / undefined 는 빈 문자열 반환", () => {
    expect(getJobLabel(null)).toBe("");
    expect(getJobLabel(undefined)).toBe("");
  });
});
