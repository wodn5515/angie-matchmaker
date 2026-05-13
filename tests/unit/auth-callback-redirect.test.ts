/**
 * D4 — OAuth 콜백 redirect 분기 단위 테스트 (010 + PR #14 리뷰 nit #2 응대 후 시그니처).
 *
 * 결정 로그:
 *   - docs/decisions/007-v2-1-review-followup.md §D4 (시간순 — 도입 시점)
 *   - docs/decisions/010-v2-unified-login.md §D3·§D4 (현재 — `from` 제거 + `isOperator` 후속 제거)
 *
 * 시그니처 진화:
 *
 *   V2.1 (007 §D4):
 *     { result, from, isOperator, next } — `?from=signup` 1-bit hint round-trip 으로
 *     실패 시 `/signup?error=oauth_failed` vs `/login?error=oauth_failed` 분기.
 *
 *   010 §D4 (PR #14 머지 직전):
 *     { result, isOperator, next } — `/signup` 폐기로 `from` 사라짐. 단,
 *     `isOperator` 는 "성공 + 운영자 화이트리스트 통과 여부" 로 형식상 보존.
 *
 *   010 §D4 + PR #14 리뷰 nit #2 (현재):
 *     { result, next } — `resolveCallbackTarget` 본문이 `isOperator` 를 한 번도
 *     참조하지 않고, route.ts 의 모든 호출 사이트가 `isOperator: false` 로 하드코딩
 *     상태였음. 010 §D4 의 의도 자체가 "콜백은 운영자/가입자 분기를 자체 결정하지
 *     않고 proxy 가드를 단일 진실원으로" — `isOperator` 파라미터는 의미가 없는
 *     dead parameter 였다. 시그니처에서 제거해 의도를 그대로 노출.
 *
 *   // 위치: lib/auth/callback.ts
 *   export type CallbackInput = {
 *     /** OAuth 결과 — 코드 누락 또는 exchangeCodeForSession 에러 시 'fail' *\/
 *     result: "ok" | "fail";
 *     /** `?next` 쿼리 값 — safeNext 통과한 안전 path. 기본 "/me". *\/
 *     next: string;
 *   };
 *
 *   export function resolveCallbackTarget(input: CallbackInput): string;
 *
 * 결정 규칙 (010 §D3·§D4 그대로 — 의미 변화 0):
 *   - result='fail'   → '/login?error=oauth_failed' (항상)
 *   - result='ok'     → next 그대로 (proxy 가드가 운영자/가입자/status 분기)
 *
 * 콜백은 더 이상 운영자/가입자 분기를 자체 결정하지 않는다 — proxy 가드를 단일
 * 진실원으로 두는 008 §D1 정신과 정합. 콜백은 단순히 `next` sentinel 을 그대로
 * 통과시키고 가드가 friends row 보고 정확한 path 로 다시 redirect.
 */

import { describe, expect, it } from "vitest";
import { resolveCallbackTarget } from "@/lib/auth/callback";

describe("resolveCallbackTarget — OAuth 콜백 redirect 분기 (010 + nit #2)", () => {
  describe("OAuth 실패 — 항상 /login?error=oauth_failed", () => {
    it("fail + next='/me' → /login?error=oauth_failed", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        next: "/me",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("fail + next='/' → /login?error=oauth_failed (실패는 안내 페이지로 일관 fallback)", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        next: "/",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("fail + next='/some/deep/path' → /login?error=oauth_failed (next 값과 무관)", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        next: "/some/deep/path",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });
  });

  describe("OAuth 성공 — next 통과 (proxy 가드가 최종 분기)", () => {
    it("ok + next='/' → '/' (운영자 sentinel — 가드가 운영자면 그대로 통과)", () => {
      // OAuth 진입 시점엔 운영자/가입자를 시스템적으로 모름.
      // 콜백은 next 만 그대로 흘리고 proxy 가드가 OPERATOR_EMAIL 비교 + friends row
      // 보고 최종 path 결정.
      const target = resolveCallbackTarget({
        result: "ok",
        next: "/",
      });
      expect(target).toBe("/");
    });

    it("ok + next='/me' → '/me' (가입자 sentinel — 가드가 status 보고 재분기)", () => {
      // 가입자 정상 로그인 흐름. proxy 가드가 friends row 보고 정확한 path 로
      // 다시 redirect (없으면 /onboarding/profile, pending 이면 /pending 등).
      const target = resolveCallbackTarget({
        result: "ok",
        next: "/me",
      });
      expect(target).toBe("/me");
    });

    it("ok + safeNext 통과한 임의 path → 그대로 (가드가 후속 분기 책임)", () => {
      // /me/profile 같은 deep path 도 콜백에선 분기 안 함. 가드 단일 진실원.
      const target = resolveCallbackTarget({
        result: "ok",
        next: "/me/profile",
      });
      expect(target).toBe("/me/profile");
    });
  });
});
