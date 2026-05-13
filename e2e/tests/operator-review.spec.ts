/**
 * E2E — 운영자 측: 가입자 심사 (승인 / 거절).
 *
 * PRD §3.2 — `/friends/[id]` 상세에서 [✓ 승인] / [✗ 거절 + 비공개 메모] 액션.
 *
 * 픽스처 가정:
 *   - `e2e/.auth/operator.json` — OPERATOR_EMAIL 화이트리스트 통과 운영자 세션
 *   - 시드 데이터: 가입자 1명이 status='pending' 상태로 친구 row 존재
 *     (worker 가 e2e/seed.sql 또는 supabase seed 로 준비)
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/operator.json" });

test.describe("운영자 — 가입자 심사", () => {
  test("/friends sub-tab '심사 대기' 에서 pending 가입자 목록 노출", async ({
    page,
  }) => {
    await page.goto("/friends?status=pending");
    await expect(page.getByRole("heading", { name: /친구|가입자/ })).toBeVisible();
    // pending 가입자 카드 1개 이상
    await expect(page.locator("[data-friend-card]").first()).toBeVisible();
  });

  test("가입자 상세에서 [승인] 클릭 → 상태가 approved 로 전환됨", async ({
    page,
  }) => {
    await page.goto("/friends?status=pending");
    await page.locator("[data-friend-card]").first().click();
    await expect(page).toHaveURL(/\/friends\/[a-f0-9-]+/);

    await page.getByRole("button", { name: /승인/ }).click();

    // 페이지 갱신 후 상태 뱃지가 approved 로 표시
    await expect(page.getByText(/승인됨|approved/)).toBeVisible();
  });

  test("가입자 상세에서 [거절] 클릭 → rejected_reason 입력 후 거절", async ({
    page,
  }) => {
    await page.goto("/friends?status=pending");
    await page.locator("[data-friend-card]").first().click();

    await page.getByRole("button", { name: /거절/ }).click();
    await page.getByLabel(/사유|메모|reason/).fill("비공개 거절 사유");
    await page.getByRole("button", { name: /확인|저장|거절 확정/ }).click();

    await expect(page.getByText(/거절됨|rejected/)).toBeVisible();
  });
});

test.describe("운영자 — 비교 뷰 이상형 양방향", () => {
  test("/compare?a=&b= 진입 시 이상형 매칭 패널의 색상 단서가 양방향 노출", async ({
    page,
  }) => {
    // 시드 가입자 두 명 — worker 가 seed 에서 픽스처 ID 노출
    await page.goto("/compare?a=11111111-aaaa-1111-aaaa-111111111111&b=22222222-bbbb-2222-bbbb-222222222222");

    // 양방향 패널 — A→B / B→A
    await expect(page.getByText(/A.*이상형.*B|B.*이상형.*A/)).toHaveCount(2);

    // 색상 단서 셀 (same / partial / different / neutral) 중 적어도 하나
    await expect(
      page.locator(".match-cell-same, .match-cell-partial, .match-cell-different, .match-cell-neutral").first(),
    ).toBeVisible();
  });
});
