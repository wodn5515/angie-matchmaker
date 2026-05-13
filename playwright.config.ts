import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 설정 — matchmaker E2E.
 *
 * V2 의 가입자 흐름·운영자 심사 흐름을 검증한다.
 * Google OAuth 자체는 모킹 어려우므로 e2e/fixtures/ 의 storageState 로 세션을 직접 주입.
 * (P1 spec — 라운드 1 에선 spec 파일만 빨갛게 잡아두고 fixture 는 worker 가 마련)
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer 는 worker 가 통과 단계에서 채움 (현재는 spec 빨강 확인만)
});
