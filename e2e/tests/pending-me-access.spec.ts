/**
 * E2E — 011 작업의 잔존 회귀: pending+onboarded 가입자가 `/me/*` 에 접근할 수 있는지.
 *
 * 013 갱신 (docs/decisions/013-pending-deprecation.md §D1·§D2):
 *   - `/pending` 페이지 자체가 삭제되어 011 의 "/pending 액션 카드 → /me/* 진입"
 *     시나리오는 본 PR 로 무의미해졌다 (해당 흐름은 `pending-deprecation.spec.ts`
 *     의 `/pending → /me` 흡수 spec 으로 대체).
 *   - 본 spec 은 011 §D1 매트릭스 중 **pending+null × /me/* pass** 행만 회귀 보호.
 *     `/me`, `/me/preferences`, `/me/survey` 등 가입자 본거지 라우트가 pending+null
 *     상태에서도 직접 URL 진입으로 통과하는지 검증.
 *
 * fixture 가정 (worker 가 마련):
 *   - `e2e/.auth/user-pending-onboarded.json` — status='pending' + onboarding_step=null
 *     인 자가 가입자 계정의 storageState.
 *
 * fixture 가 아직 없으면 Playwright 가 storageState 파일 missing 으로 자연 실패
 * (라운드 1 단계에서 의도된 빨강).
 */

import { test, expect } from "@playwright/test";

test.describe("011 — pending+onboarded 가입자의 /me/* 접근 (013 흡수 후 잔존 회귀)", () => {
  test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

  test("/me, /me/preferences, /me/survey 도 직접 URL 진입이 통과한다", async ({
    page,
  }) => {
    // 011 §D1 매트릭스 — pending+null 에게 열린 /me/* 라우트들. 013 §D1 에서도
    // 동일 행은 pass 유지 (회귀 보호).
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);

    await page.goto("/me/preferences");
    await expect(page).toHaveURL(/\/me\/preferences$/);

    await page.goto("/me/survey");
    await expect(page).toHaveURL(/\/me\/survey$/);
  });
});
