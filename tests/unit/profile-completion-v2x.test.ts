/**
 * profileCompletion V2.x 동기화 — PR #22 리뷰 🟢 nit (012 §D8).
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D8
 *
 * ## 배경
 *
 * 현재 `app/me/page.tsx:31-47` 의 인라인 profileCompletion 계산이 V2.x 4 필드
 * (smoking / drinking / marriage_view / tattoo) 를 반영하지 않아 가입자가 4 필드 모두
 * 채워도 "권장 7개 중 X" 수준의 옛 점수를 보여준다.
 *
 * `lib/db/friends.ts` 의 `profileCompletion(f: Friend): number` 는 이미 V2.x 11 필드를
 * 100점 만점 기준으로 합산하도록 갱신되어 있다 (운영자 측 사용).
 *
 * D8 결정: 가입자 측 me page 의 점수도 같은 11 필드 기준으로 동기화. region_detail
 * 자체는 권장 필드에 포함하지 않음 (광역만 채워도 "거주지 채움" 인정).
 *
 * ## 검증 포인트
 *
 * 1. `lib/db/friends.ts:profileCompletion` 함수 자체:
 *    - 권장 11 필드 모두 채워지면 100 반환
 *    - 권장 0 필드 + 필수만 → 30 (base)
 *    - 4 필드 (smoking/drinking/marriage_view/tattoo) 가 점수에 기여한다
 *      (이 필드를 빼면 점수가 떨어지는지 검증)
 *
 * 2. `app/me/page.tsx` 의 인라인 계산이 `lib/db/friends.ts:profileCompletion` 과
 *    같은 도메인 — worker 가 (옵션 B) 함수 재사용 또는 (옵션 A) 동일 11 필드 인라인
 *    유지. 본 spec 은 라이브러리 함수의 동작만 단정 (UI 통합 검증은 통합/e2e 가 담당).
 *
 * 3. region_detail 은 권장 필드에 포함되지 않는다 (D8 명시):
 *    - region=null, region_detail=null vs region='seoul', region_detail=null →
 *      후자가 더 높은 점수
 *    - region='seoul', region_detail=null vs region='seoul', region_detail='gangnam-gu' →
 *      같은 점수 (region_detail 은 가산 없음)
 */

import { describe, expect, it } from "vitest";
import { profileCompletion } from "@/lib/db/friends";

// ─────────────────────────────────────────────────────────────
// 헬퍼 — 필수 필드 채운 minimal Friend 객체. tier2 필드는 호출처에서 덮어쓴다.
// `Friend` 타입에 V2.x 4 필드 (smoking/drinking/marriage_view/tattoo) 가
// 포함되어 있다고 가정.
// ─────────────────────────────────────────────────────────────

function baseFriend(overrides: Record<string, unknown> = {}) {
  // 필수 5 + 권장 11 + region_detail/hometown_detail (012 신설) 의 형태.
  // 권장은 모두 null/false 로 시작 — overrides 에서 채워 점수 가산 측정.
  return {
    id: "f-1",
    owner_id: "owner-1",
    auth_user_id: "u-1",
    name: "홍길동",
    gender: "male",
    preferred_gender: "female",
    recommender_name: "김영희",
    recommender_relation: "대학 동기",
    status: "approved",
    onboarding_step: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // 권장 11
    birth_year: null,
    region: null,
    region_detail: null,
    hometown: null,
    hometown_detail: null,
    occupation: null,
    instagram: null,
    relationship_status: null,
    match_interest: null,
    smoking: null,
    drinking: null,
    marriage_view: null,
    tattoo: null,
    ...overrides,
  } as unknown as Parameters<typeof profileCompletion>[0];
}

describe("profileCompletion — V2.x 11 권장 필드 합산 (D8)", () => {
  it("권장 0 필드 + 필수만 채워졌으면 30 (base)", () => {
    const score = profileCompletion(baseFriend());
    expect(score).toBe(30);
  });

  it("권장 11 필드 전부 채워지면 100 (만점)", () => {
    const score = profileCompletion(
      baseFriend({
        birth_year: 1995,
        region: "seoul",
        hometown: "busan",
        occupation: "office",
        instagram: "@me",
        relationship_status: "single",
        match_interest: "high",
        smoking: "non_smoker",
        drinking: "sometimes",
        marriage_view: "within_2y",
        tattoo: "none",
      }),
    );
    expect(score).toBe(100);
  });

  it("V2.x 4 필드 (smoking/drinking/marriage_view/tattoo) 가 점수에 기여한다", () => {
    // 권장 7 (V1) 만 채우고 4 필드 빈 경우 vs 4 필드 추가 채운 경우 — 후자가 높아야 함.
    const v1Only = profileCompletion(
      baseFriend({
        birth_year: 1995,
        region: "seoul",
        hometown: "busan",
        occupation: "office",
        instagram: "@me",
        relationship_status: "single",
        match_interest: "high",
      }),
    );
    const v2All = profileCompletion(
      baseFriend({
        birth_year: 1995,
        region: "seoul",
        hometown: "busan",
        occupation: "office",
        instagram: "@me",
        relationship_status: "single",
        match_interest: "high",
        smoking: "non_smoker",
        drinking: "sometimes",
        marriage_view: "within_2y",
        tattoo: "none",
      }),
    );
    expect(v2All).toBeGreaterThan(v1Only);
    expect(v2All).toBe(100);
  });

  it("smoking 한 필드만 추가해도 점수가 올라간다 (각 필드 독립 기여)", () => {
    const without = profileCompletion(baseFriend());
    const with_ = profileCompletion(baseFriend({ smoking: "non_smoker" }));
    expect(with_).toBeGreaterThan(without);
  });

  it("drinking 한 필드만 추가해도 점수가 올라간다", () => {
    const without = profileCompletion(baseFriend());
    const with_ = profileCompletion(baseFriend({ drinking: "sometimes" }));
    expect(with_).toBeGreaterThan(without);
  });

  it("marriage_view 한 필드만 추가해도 점수가 올라간다", () => {
    const without = profileCompletion(baseFriend());
    const with_ = profileCompletion(baseFriend({ marriage_view: "within_2y" }));
    expect(with_).toBeGreaterThan(without);
  });

  it("tattoo 한 필드만 추가해도 점수가 올라간다", () => {
    const without = profileCompletion(baseFriend());
    const with_ = profileCompletion(baseFriend({ tattoo: "none" }));
    expect(with_).toBeGreaterThan(without);
  });
});

describe("profileCompletion — region_detail 은 권장 필드 X (012 §D8)", () => {
  it("region=null 보다 region='seoul' 이 더 높다 (광역은 권장 필드)", () => {
    const a = profileCompletion(baseFriend({ region: null }));
    const b = profileCompletion(baseFriend({ region: "seoul" }));
    expect(b).toBeGreaterThan(a);
  });

  it("region='seoul', region_detail=null 과 region='seoul', region_detail='gangnam-gu' 점수가 같다", () => {
    // D8 — region_detail 은 가산 없음. 광역만 채워도 "거주지 채움" 인정.
    const onlyRegion = profileCompletion(
      baseFriend({ region: "seoul", region_detail: null }),
    );
    const withDetail = profileCompletion(
      baseFriend({ region: "seoul", region_detail: "gangnam-gu" }),
    );
    expect(withDetail).toBe(onlyRegion);
  });

  it("hometown_detail 도 점수에 기여하지 않는다 (대칭)", () => {
    const onlyHometown = profileCompletion(
      baseFriend({ hometown: "busan", hometown_detail: null }),
    );
    const withDetail = profileCompletion(
      baseFriend({ hometown: "busan", hometown_detail: "haeundae-gu" }),
    );
    expect(withDetail).toBe(onlyHometown);
  });
});

describe("app/me/page.tsx — profileCompletion 재사용 정적 검증 (D8 핵심)", () => {
  // D8 의 핵심 — me page 의 인라인 점수 계산이 lib/db/friends:profileCompletion
  // 과 동일 11 필드를 반영해야 한다. worker 가 (옵션 B) 함수 재사용을 채택하면
  // 정적 import 그래프로 검증 가능. 옵션 A (인라인) 채택 시엔 본 spec 이 빨강이 되어
  // Lead 가 spec 약화 또는 옵션 B 강제를 판단하도록 한다.

  it("app/me/page.tsx 가 lib/db/friends 의 profileCompletion 을 import 한다", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const src = readFileSync(
      path.resolve(__dirname, "../../app/me/page.tsx"),
      "utf-8",
    );
    // import { ..., profileCompletion, ... } from "@/lib/db/friends" 등의 패턴
    const importsHelper =
      /import\s+\{[^}]*\bprofileCompletion\b[^}]*\}\s+from\s+["']@\/lib\/db\/friends["']/.test(
        src,
      );
    expect(importsHelper).toBe(true);
  });

  it("app/me/page.tsx 에 V2.x 4 필드 (smoking/drinking/marriage_view/tattoo) 가 SELECT 또는 합산 로직에 반영된다", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const src = readFileSync(
      path.resolve(__dirname, "../../app/me/page.tsx"),
      "utf-8",
    );
    // 옵션 A (인라인 유지) 채택 시: 4 필드명이 본문에 모두 등장해야 함.
    // 옵션 B (함수 재사용) 채택 시: profileCompletion(friend) 호출 + select 가 friend 객체
    // 전부 fetch 하므로 select 안에 4 필드명이 들어가야 함.
    expect(src).toMatch(/\bsmoking\b/);
    expect(src).toMatch(/\bdrinking\b/);
    expect(src).toMatch(/\bmarriage_view\b/);
    expect(src).toMatch(/\btattoo\b/);
  });
});

describe("profileCompletion — 점수 범위·반올림 sanity", () => {
  it("score 는 항상 [0, 100] 범위 안", () => {
    const samples = [
      baseFriend(),
      baseFriend({ smoking: "non_smoker" }),
      baseFriend({
        birth_year: 1995,
        region: "seoul",
        hometown: "busan",
        occupation: "office",
        instagram: "@me",
        relationship_status: "single",
        match_interest: "high",
        smoking: "non_smoker",
        drinking: "sometimes",
        marriage_view: "within_2y",
        tattoo: "none",
      }),
    ];
    for (const s of samples) {
      const v = profileCompletion(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
