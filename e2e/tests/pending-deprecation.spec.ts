/**
 * E2E — 013 작업: /pending 라우트 폐기 + /me 흡수 회귀 방지.
 *
 * 결정 로그: docs/decisions/013-pending-deprecation.md §D1·§D2·§D3
 *
 * ## 검증 시나리오
 *
 * 1. **pending+onboarded 가입자**가 `/pending` 직접 진입 → 가드가 `/me` 로 흡수.
 *    011 의 `pending-me-access.spec.ts` 와 같은 fixture (`user-pending-onboarded`)
 *    재사용. 011 의 spec 은 `/pending` 안내 페이지 자체의 존재를 가정했으나,
 *    013 §D1·§D2 로 페이지 폐기 + 가드 redirect — 동일 fixture 로 URL 흡수만 검증.
 *
 * 2. **비로그인**이 `/pending` 직접 진입 → `/login` 으로 흡수 (013 §D1 매트릭스
 *    NEW — 폐기된 라우트라 announcement 자격 박탈).
 *
 * 3. (회귀) `/me` 의 안내 배너에 "직접 안내" 류 약속 카피가 노출되지 않는다.
 *    `me-page-copy.test.tsx` 가 소스 텍스트 레벨로 검증하지만, e2e 는 실제 렌더
 *    상태에서도 부재함을 한 번 더 가드.
 *
 * ## fixture 가정 (worker 가 마련)
 *
 * - `e2e/.auth/user-pending-onboarded.json` — status='pending' + onboarding_step=null
 *   인 자가 가입자 storageState. 011 과 공유.
 *
 * fixture 미존재 시 Playwright 가 storageState 파일 missing 으로 자연 실패
 * (라운드 1 의도된 빨강).
 */

import { test, expect } from "@playwright/test";

test.describe("013 — /pending 라우트 폐기 흡수", () => {
  test.describe("pending+onboarded 가입자", () => {
    test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

    test("/pending 직접 진입 → 가드가 /me 로 redirect (013 §D1)", async ({
      page,
    }) => {
      // 013 §D1 매트릭스 — pending+null × /pending: pass → redirect /me.
      // 외부 링크/북마크 호환은 가드 흡수로 보존.
      await page.goto("/pending");
      await expect(page).toHaveURL(/\/me$/);
      // /pending 잔류가 아닌지 명시 검증.
      await expect(page).not.toHaveURL(/\/pending/);
    });

    test("/me 안내 배너에 '직접 안내' 류 약속 카피가 노출되지 않는다 (013 §D3)", async ({
      page,
    }) => {
      // D3 — pending StatusBanner description 에서 "직접 안내드릴게요" 제거 +
      // 하단 footer "매칭은 운영자가 직접 안내해요..." 삭제.
      await page.goto("/me");

      // 핵심 — 사용자에게 "직접 안내" 약속이 보이면 안 된다.
      await expect(page.getByText(/직접 안내/)).toHaveCount(0);
      await expect(page.getByText(/안내드릴게요/)).toHaveCount(0);
      await expect(page.getByText(/매칭은 운영자가 직접/)).toHaveCount(0);
    });
  });

  test.describe("비로그인", () => {
    // 명시적으로 storageState 미지정 — 익명 컨텍스트.
    test.use({ storageState: { cookies: [], origins: [] } });

    test("/pending 직접 진입 → /login 으로 redirect (013 §D1 NEW)", async ({
      page,
    }) => {
      // 013 §D1 매트릭스 — 비로그인 × /pending: pass (announcement) → redirect /login.
      // 폐기된 라우트라 announcement 자격 박탈. 외부 링크 호환은 /login 진입 후
      // 가드의 다음 hop 으로 자연 보존.
      await page.goto("/pending");
      await expect(page).toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/pending/);
    });

    test("/rejected 직접 진입은 announcement 로 유지 (회귀)", async ({
      page,
    }) => {
      // 013 후속 영향 — announcement 라우트는 /rejected 만 남는다. 비로그인의
      // 외부 링크 진입은 안내 톤이 유지되어야 한다.
      await page.goto("/rejected");
      await expect(page).toHaveURL(/\/rejected/);
      await expect(page).not.toHaveURL(/\/login/);
    });
  });
});
