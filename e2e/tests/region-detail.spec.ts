/**
 * E2E — 012 작업: 거주/출신 지역 2단계 세분화 가입자 흐름.
 *
 * 결정 로그 012 §D1~§D9 — 본인 프로필 cascade + 이상형 expandable.
 *
 * ## 검증 시나리오
 *
 * 1. /me/profile (본인 프로필) cascade — 거주지역 광역 선택 후 detail 선택, 저장,
 *    재진입 시 상태 복원 + "서울 강남구" 결합 라벨 노출.
 * 2. /me/preferences (이상형) — 광역 row expand 후 detail 체크, 저장, 재진입 시
 *    같은 상태 복원.
 *
 * fixture 가정 (worker 가 마련):
 *   - `e2e/.auth/user-pending-onboarded.json` — pending+onboarding_step=null 가입자.
 *     011 작업의 fixture 패턴 재사용.
 *
 * fixture 부재 시 storageState missing 으로 자연 실패 (라운드 1 baseline 빨강).
 */

import { test, expect } from "@playwright/test";

test.describe("012 — /me/profile cascade (region → region_detail)", () => {
  test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

  test("거주지역 '서울' 선택 → cascade detail '강남구' 선택 → 저장 → 재진입 시 '서울 강남구' 복원", async ({
    page,
  }) => {
    await page.goto("/me/profile");
    await expect(page).toHaveURL(/\/me\/profile$/);

    // 1) 거주지역 광역 select
    const regionSelect = page.getByLabel(/거주\s*지역/);
    await expect(regionSelect).toBeVisible();
    await regionSelect.selectOption({ value: "seoul" });

    // 2) cascade — region_detail Select 가 등장 (서울 선택 후)
    const regionDetail = page.getByLabel(/세부\s*지역|거주\s*세부|구\s*\/\s*시/);
    await expect(regionDetail).toBeVisible();
    await regionDetail.selectOption({ value: "gangnam-gu" });

    // 3) 저장
    await page.getByRole("button", { name: /저장|제출|완료/ }).click();

    // 4) 재진입 후 상태 복원 — 결합 라벨 또는 select value
    await page.goto("/me/profile");
    // 결합 라벨 "서울 강남구" 가 페이지 어딘가에 노출
    await expect(page.getByText(/서울 강남구/)).toBeVisible();
  });

  test("거주지역 광역만 선택하고 detail 비우면 저장 가능 (D1 — region only)", async ({
    page,
  }) => {
    await page.goto("/me/profile");
    const regionSelect = page.getByLabel(/거주\s*지역/);
    await regionSelect.selectOption({ value: "busan" });

    // detail Select 가 등장하더라도 비워둔다 (None / 선택 안 함)
    // worker 가 "선택 안 함" 옵션을 제공해야 함 — D5 단순 select 2개.
    await page.getByRole("button", { name: /저장|제출|완료/ }).click();

    await page.goto("/me/profile");
    // 광역 라벨 '부산' 만 노출 (강남구 등 detail 안 붙음)
    await expect(page.getByText(/부산/)).toBeVisible();
  });
});

test.describe("012 — /me/preferences (이상형 multi)", () => {
  test.use({ storageState: "e2e/.auth/user-pending-onboarded.json" });

  test("거주지역 '서울' expand → '강남구' 체크 → 저장 → 재진입 시 같은 상태", async ({
    page,
  }) => {
    await page.goto("/me/preferences");
    await expect(page).toHaveURL(/\/me\/preferences$/);

    // 1) 서울 행 expand
    const seoulRow = page.getByRole("button", { name: /서울/ });
    await expect(seoulRow).toBeVisible();
    await seoulRow.click();

    // 2) 강남구 체크
    const gangnam = page.getByLabel(/강남구/);
    await expect(gangnam).toBeVisible();
    await gangnam.check();

    // 3) 저장
    await page.getByRole("button", { name: /저장|제출|완료/ }).click();

    // 4) 재진입
    await page.goto("/me/preferences");
    // 상단 요약 칩 또는 expand 시 체크 상태 복원
    // 상단 요약 칩 가정 (디자이너 게이트) — "서울 강남구"
    await expect(page.getByText(/서울 강남구/)).toBeVisible();
  });

  test("서울 '전체' 토글 → 저장 → 재진입 시 '서울 전체' 노출 (디자이너 게이트 — all 상태)", async ({
    page,
  }) => {
    await page.goto("/me/preferences");

    // "서울 전체" 라벨로 클릭 가능 — 디자이너 헤더 토글
    const seoulAll = page.getByRole("button", {
      name: /서울.*전체|전체.*서울/,
    });
    await expect(seoulAll).toBeVisible();
    await seoulAll.click();

    await page.getByRole("button", { name: /저장|제출|완료/ }).click();

    await page.goto("/me/preferences");
    // 상단 요약 칩 — "서울 전체" 또는 "서울" 헤더 안 "전체" 배지
    await expect(page.getByText(/서울.*전체|전체/)).toBeVisible();
  });
});
