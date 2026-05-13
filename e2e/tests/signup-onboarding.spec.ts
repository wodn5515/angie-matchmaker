/**
 * E2E — 가입자 측 흐름: 가입 → 온보딩 Step 1~3 → /me (013 흡수 후).
 *
 * PRD §3.1 (가입 / 온보딩). Google OAuth 자체는 모킹 어려우므로 worker 가
 * `e2e/.auth/user-fresh.json` (신규 가입자, friends row 없음)
 * `e2e/.auth/user-pending.json` (Step 1 만 완료, status=pending)
 * 등의 storageState 픽스처를 마련해 두고 spec 에서 `test.use({ storageState })` 로 주입.
 *
 * 013 갱신 (docs/decisions/013-pending-deprecation.md §D1·§D2):
 *   - `/pending` 라우트 폐기. 온보딩 Step 3 완료 시 redirect target 은 `/me`.
 *   - 심사 대기 안내 자체는 `/me` 상단 StatusBanner (pending 분기) 가 인수.
 *
 * 이 P1 spec 은 worker 가 픽스처 + Server Action 까지 채우기 전엔 모두 실패.
 */

import { test, expect } from "@playwright/test";

test.describe("가입자 측 — Step 1 (필수) 흐름", () => {
  test.use({ storageState: "e2e/.auth/user-fresh.json" });

  test("신규 가입자가 /signup 진입 후 /onboarding/profile 로 라우팅된다", async ({
    page,
  }) => {
    await page.goto("/signup");
    // OAuth 완료 후 신규 가입자라면 onboarding 으로
    await expect(page).toHaveURL(/\/onboarding\/profile/);
  });

  test("Step 1 필수 필드 입력 후 제출 → /onboarding/preferences 로 이동", async ({
    page,
  }) => {
    await page.goto("/onboarding/profile");

    await page.getByLabel("이름").fill("테스트사용자");
    // 성별 / 성취향 / 추천인 — 필수
    await page.getByLabel("성별").selectOption("female");
    await page.getByLabel("선호 성별").selectOption("male");
    await page.getByLabel("추천인 이름").fill("김영희");
    await page.getByLabel("추천인 관계").fill("대학 동기");

    await page.getByRole("button", { name: /제출|다음/ }).click();

    await expect(page).toHaveURL(/\/onboarding\/preferences/);
  });

  test("Step 1 필수 필드 비어있으면 검증 에러로 제출 막힘", async ({ page }) => {
    await page.goto("/onboarding/profile");
    await page.getByRole("button", { name: /제출|다음/ }).click();
    // 페이지 이동 X
    await expect(page).toHaveURL(/\/onboarding\/profile/);
  });
});

test.describe("가입자 측 — Step 2/3 skip 가능 + /me 흡수 (013)", () => {
  test.use({ storageState: "e2e/.auth/user-step2.json" });

  test("Step 2 (preferences) skip 버튼 → /onboarding/survey 로 이동", async ({
    page,
  }) => {
    await page.goto("/onboarding/preferences");
    await page.getByRole("button", { name: /건너뛰기|skip/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/survey/);
  });
});

test.describe("가입자 측 — Step 3 완료 후 /me (013)", () => {
  test.use({ storageState: "e2e/.auth/user-step3.json" });

  test("Step 3 skip → /me 로 이동 + 심사 대기 배너 노출 (013 §D1·§D3)", async ({
    page,
  }) => {
    // 013 §D1 — `finishOnboardingSurveyAction` redirect target 이 `/pending` → `/me` 로 변경.
    // 013 §D3 — 심사 대기 안내는 `/me` 상단 StatusBanner (pending 분기) 가 인수.
    await page.goto("/onboarding/survey");
    await page.getByRole("button", { name: /건너뛰기|skip/i }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(/심사 중|검토 중/)).toBeVisible();
  });
});

test.describe("이어풀기 — 가입 도중 이탈 후 재진입", () => {
  test.use({ storageState: "e2e/.auth/user-step2.json" });

  test("Step 2 미완 상태에서 /me 진입 → /onboarding/preferences 로 라우팅", async ({
    page,
  }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/onboarding\/preferences/);
  });
});
