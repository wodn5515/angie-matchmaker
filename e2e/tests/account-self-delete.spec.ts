/**
 * E2E — 014 가입자 자가 탈퇴 흐름.
 *
 * 결정 로그: docs/decisions/014-account-self-delete.md (전체 D1~D6)
 *
 * ## 시나리오
 *
 * 1. pending+onboarded 가입자가 /me 에 진입
 * 2. "위험 영역" disclosure expand
 * 3. 본인 이름 input 에 friends.name 정확 일치 입력
 * 4. "계정 삭제" 버튼 활성화 → 클릭
 * 5. server action 이 auth.admin.deleteUser → cascade chain 정리 → redirect /login?deleted=1
 * 6. /login 페이지가 ?deleted=1 안내 배너 노출
 *
 * ## fixture 가정 (worker 가 마련)
 *
 * - `e2e/.auth/user-pending-onboarded.json` — status='pending' + onboarding_step=null
 *   인 자가 가입자 storageState. 011 / 013 spec 과 공유 fixture.
 *   *이 fixture 의 friends.name 은 spec 안의 `EXPECTED_NAME` 과 일치해야 한다.*
 *   (worker 가 fixture seed 시 동일 상수 사용 — 014 의 새 fixture 요건은 아님,
 *   기존 fixture 의 name 만 알아두면 OK)
 *
 * fixture 부재 시 Playwright 가 storageState 파일 missing 으로 자연 실패
 * (라운드 1 단계 의도된 baseline 빨강 — 011 패턴 동일).
 *
 * ## DB 검증 (후속)
 *
 * cascade chain 정리 자체는 `tests/integration/account-self-delete.test.ts` 가
 * 마이그레이션 텍스트 회귀로, 실제 DB row 0건 검증은 worker 가 fixture 와 함께
 * Supabase 헬퍼를 마련한 후 추가 spec 으로 (라운드 3 단위 보강에서 의논).
 */

import { test, expect } from "@playwright/test";

/**
 * fixture seed 가 friends.name 에 사용해야 하는 값.
 * worker 가 fixture 마련 시 동일 상수를 import 하거나 똑같이 적어둔다 — 미스매치 시
 * "본인 이름 정확 일치" 분기가 case-sensitive 실패 → 버튼 비활성으로 spec 실패해
 * fixture 정합이 자연스럽게 회귀 가드.
 */
const EXPECTED_NAME = "Alice";

test.describe("014 — pending+onboarded 가입자의 자가 탈퇴 흐름", () => {
  test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

  test("/me 위험 영역 expand → 본인 이름 입력 → 삭제 → /login?deleted=1 도달", async ({
    page,
  }) => {
    // §D1 — /me 본문 마지막에 위험 영역 inline expandable.
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);

    // 위험 영역 헤더 클릭으로 expand.
    // <details>/<summary> native 패턴 가정 — getByText("위험 영역") 로 잡힘.
    const dangerSummary = page.getByText(/위험\s*영역/);
    await expect(dangerSummary).toBeVisible();
    await dangerSummary.click();

    // expand 후 — 영구 삭제 경고 + 본인 이름 input + 계정 삭제 버튼 노출.
    await expect(page.getByText(/영구\s*삭제|복구할\s*수\s*없/)).toBeVisible();

    const input = page.getByRole("textbox").last();
    const deleteButton = page.getByRole("button", { name: /계정\s*삭제/ });

    // 초기 disabled — input 비어있음.
    await expect(deleteButton).toBeDisabled();

    // 본인 이름 입력 → 활성화.
    await input.fill(EXPECTED_NAME);
    await expect(deleteButton).toBeEnabled();

    // 클릭 → server action → redirect /login?deleted=1.
    await deleteButton.click();

    // §D5 — /login?deleted=1 으로 도달.
    await expect(page).toHaveURL(/\/login\?.*deleted=1/);
  });

  test("/login?deleted=1 안내 배너 노출 (014 §D5)", async ({ page }) => {
    // 위 spec 의 후속 — 실제 redirect 가 도달했을 때 안내 카피가 보이는지 별도 검증.
    // 자체 진입 (탈퇴 안 한 상태에서 query 만 붙임) 으로도 안내가 보여야 함 (가드는
    // /login 페이지가 운영자 redirect 정도만, 안내 카피는 query 분기로 자유 노출).
    await page.goto("/login?deleted=1");
    await expect(page.getByText(/계정이?\s*삭제/)).toBeVisible();
    await expect(page.getByText(/다시\s*가입.*Google|Google.*다시\s*가입/)).toBeVisible();
  });

  test("/login (query 부재) — 안내 배너 부재 (회귀)", async ({ page }) => {
    // §D5 enum 화 — ?deleted=1 만 안내. 부재 시 일반 로그인 화면.
    await page.goto("/login");
    await expect(page.getByText(/계정이?\s*삭제/)).toHaveCount(0);
  });
});

test.describe("014 — 운영자 우회 차단 (§D4)", () => {
  // 운영자 storageState — 운영자가 /me 자체에 진입할 수 없으므로 (가드 단에서 / 로 흡수)
  // 실질적으로 운영자가 위험 영역 버튼을 누르는 시나리오는 도달 불가.
  // 본 e2e 는 가드 차원의 부재만 회귀.
  test.use({ storageState: "e2e/.auth/operator.json" });

  test("운영자는 /me 진입 자체가 막혀 위험 영역에 도달하지 못한다", async ({
    page,
  }) => {
    await page.goto("/me");
    // 운영자는 / 로 흡수 (가드 매트릭스).
    await expect(page).not.toHaveURL(/\/me$/);
  });
});
