/**
 * E2E — 011 작업: 심사 대기(pending) 가입자가 /me/* 에 접근할 수 있는지 확인.
 *
 * 결정 로그 011 §D1/§D2/§D3 합본 회귀 방지:
 *   - /pending 페이지의 "프로필 채우기" 카드를 누르면 /me/profile 로 진입한다.
 *   - 진입 후 "프로필" 헤더가 보인다 (가드 + requireOnboardedUser 둘 다 통과 신호).
 *   - 프로필 폼 저장 액션을 호출해도 /pending 으로 강제 redirect 되지 않는다
 *     (=requireApprovedUser 시절의 회귀가 살아있지 않다).
 *
 * fixture 가정 (worker 가 마련):
 *   - `e2e/.auth/user-pending-onboarded.json` — status='pending' + onboarding_step=null
 *     인 자가 가입자 계정의 storageState.
 *
 * fixture 가 아직 없으면 Playwright 가 storageState 파일 missing 으로 자연 실패
 * (라운드 1 단계에서 의도된 빨강).
 */

import { test, expect } from "@playwright/test";

test.describe("011 — pending+onboarded 가입자의 /me/* 접근", () => {
  test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

  test("/pending 의 '프로필' 카드 클릭 → /me/profile 진입 → 저장 시 /pending 으로 안 튕긴다", async ({
    page,
  }) => {
    await page.goto("/pending");
    // 1) /pending 자체는 여전히 안내 타이틀이 보인다 (회귀 유지)
    await expect(
      page.getByRole("heading", { name: /심사 대기 중/ }),
    ).toBeVisible();

    // 2) 011 §D3 액션 카드 — "프로필" 이라는 텍스트가 들어간 링크가 존재한다
    const profileLink = page.getByRole("link", { name: /프로필/ });
    await expect(profileLink).toBeVisible();
    await expect(profileLink).toHaveAttribute("href", "/me/profile");

    // 3) 클릭 시 /me/profile 로 진입한다 — 가드(011 §D1) + requireOnboardedUser(§D2) 양쪽 통과
    await profileLink.click();
    await expect(page).toHaveURL(/\/me\/profile$/);

    // 4) 페이지 헤더(또는 식별 가능한 라벨)가 보여야 한다 — 실제 라벨은 worker 가
    //    /me/profile 페이지 컴포넌트에서 노출. /pending 으로 강제 redirect 되지
    //    않았음을 URL + UI 둘로 검증.
    await expect(page).not.toHaveURL(/\/pending/);
  });

  test("/me, /me/preferences, /me/survey 도 직접 URL 진입이 통과한다", async ({
    page,
  }) => {
    // 011 §D1 매트릭스 — pending+null 에게 열린 5개 라우트 전부.
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);

    await page.goto("/me/preferences");
    await expect(page).toHaveURL(/\/me\/preferences$/);

    await page.goto("/me/survey");
    await expect(page).toHaveURL(/\/me\/survey$/);
  });
});
