import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest 설정 — matchmaker 단위/통합 테스트 러너.
 *
 * - tests/unit/**       단위 (Vitest + RTL, jsdom)
 * - tests/integration/** 통합 (Vitest, node) — DB / 마이그레이션 인접
 *
 * Playwright e2e 는 별도 (e2e/tests/**)
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
