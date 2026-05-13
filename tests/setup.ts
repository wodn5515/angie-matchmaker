/**
 * Vitest 전역 setup — RTL matchers + 환경변수 기본값.
 *
 * 테스트는 실제 Supabase / OPERATOR_EMAIL 환경에 의존하지 않아야 한다.
 * 필요한 env 는 spec 안에서 vi.stubEnv 또는 process.env 로 주입.
 */

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
