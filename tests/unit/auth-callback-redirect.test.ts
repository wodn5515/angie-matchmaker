/**
 * D4 — OAuth 콜백 redirect 분기 단위 테스트 (010 통합 후 시그니처).
 *
 * 결정 로그:
 *   - docs/decisions/007-v2-1-review-followup.md §D4 (시간순 — 도입 시점)
 *   - docs/decisions/010-v2-unified-login.md §D3·§D4 (현재 — `from` 제거)
 *
 * V2.1 (007) 단계에선 `?from=signup` 1-bit hint 로 콜백 실패 시
 * `/signup?error=oauth_failed` vs `/login?error=oauth_failed` 를 분기했다.
 *
 * 010 결정으로 `/signup` 라우트가 폐기되고 `/login` 으로 진입점이 단일화되면서
 * `from` 파라미터의 retroactive 의미가 사라졌다 (`/signup` 자체 부재). 시그니처는
 * 다음으로 단순화:
 *
 *   // 위치: lib/auth/callback.ts
 *   export type CallbackInput = {
 *     /** OAuth 결과 — 코드 누락 또는 exchangeCodeForSession 에러 시 'fail' *\/
 *     result: "ok" | "fail";
 *     /** 성공 + 운영자 화이트리스트 통과 여부. fail 일 때는 무시. *\/
 *     isOperator: boolean;
 *     /** `?next` 쿼리 값 — safeNext 통과한 안전 path. 기본 "/me". *\/
 *     next: string;
 *   };
 *
 *   export function resolveCallbackTarget(input: CallbackInput): string;
 *
 * 결정 규칙 (010 §D3·§D4):
 *   - result='fail'                 → '/login?error=oauth_failed' (항상)
 *   - result='ok' + isOperator      → next 그대로 (proxy 가드가 추가 분기)
 *   - result='ok' + !isOperator     → next 그대로 (proxy 가드가 friend status
 *                                                 로 최종 path 결정)
 *
 * 콜백은 더 이상 운영자/가입자 분기를 자체 결정하지 않는다 — proxy 가드를 단일
 * 진실원으로 두는 008 §D1 정신과 정합. 콜백은 단순히 `next` sentinel 을 그대로
 * 통과시키고 가드가 friends row 보고 정확한 path 로 다시 redirect.
 */

import { describe, expect, it } from "vitest";
import { resolveCallbackTarget } from "@/lib/auth/callback";

describe("resolveCallbackTarget — OAuth 콜백 redirect 분기 (010 통합)", () => {
  describe("OAuth 실패 — 항상 /login?error=oauth_failed", () => {
    it("fail + 비운영자 → /login?error=oauth_failed", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        isOperator: false,
        next: "/me",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("fail + isOperator 값에 무관하게 /login?error=oauth_failed (실패 시 분류 무의미)", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        isOperator: true,
        next: "/",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("fail + next 값과 무관하게 /login?error=oauth_failed (실패는 안내 페이지로 일관 fallback)", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        isOperator: false,
        next: "/some/deep/path",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });
  });

  describe("OAuth 성공 — next 통과 (proxy 가드가 최종 분기)", () => {
    it("ok + 운영자 + next='/' → '/' (운영자 대시보드)", () => {
      // 운영자 정상 로그인 흐름. proxy 가드가 isOperator 보고 통과시킴.
      const target = resolveCallbackTarget({
        result: "ok",
        isOperator: true,
        next: "/",
      });
      expect(target).toBe("/");
    });

    it("ok + 비운영자 + next='/me' → '/me' (가입자 sentinel)", () => {
      // 가입자 정상 로그인 흐름. proxy 가드가 friends row 보고 정확한 path 로
      // 다시 redirect (없으면 /onboarding/profile, pending 이면 /pending 등).
      const target = resolveCallbackTarget({
        result: "ok",
        isOperator: false,
        next: "/me",
      });
      expect(target).toBe("/me");
    });

    it("ok + next 가 지정되면 isOperator 무관하게 그 값으로", () => {
      // safeNext 통과한 임의 path 도 그대로 통과 — 가드가 후속 분기 책임.
      const target = resolveCallbackTarget({
        result: "ok",
        isOperator: false,
        next: "/me/profile",
      });
      expect(target).toBe("/me/profile");
    });

    it("ok + next='/' + 비운영자 → '/' (가드가 다시 가입자 라우트로 redirect)", () => {
      // 사용자 명시 단순화: "OAuth 진입 시점엔 운영자/가입자 모를 수밖에 없음".
      // 콜백은 next 만 통과시키고 가드가 friends row 보고 분기. 한 hop 더 추가되지만
      // 가드 단일 진실원 정신 (008 §D1) 정합 — 010 §D3.
      const target = resolveCallbackTarget({
        result: "ok",
        isOperator: false,
        next: "/",
      });
      expect(target).toBe("/");
    });
  });
});
