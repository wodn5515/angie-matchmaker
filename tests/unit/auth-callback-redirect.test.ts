/**
 * D4 — OAuth 콜백 실패 시 redirect 분기 단위 테스트.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D4
 *
 * 현재 구현은 OAuth 실패 시 항상 `/login?error=oauth_failed` 로 보낸다.
 * `/signup` 에서 들어온 가입자가 OAuth 실패 시 운영자 진입 페이지로 보내지는 부조화.
 * `/signup` 의 `signInWithOAuth` 에서 `redirectTo: ".../auth/callback?from=signup"`
 * 으로 1-bit hint 를 넣어, 콜백이 from 값으로 분기.
 *
 * worker 가 채울 인터페이스 (순수 함수 — 단위 테스트 가능하게 분리):
 *
 *   // 위치: app/auth/callback/route.ts 의 helper 로 export 또는
 *   //       lib/auth/callback.ts 같은 모듈로 분리 (Lead 자율 채택)
 *   export type CallbackInput = {
 *     /** OAuth 결과 — 코드 누락 또는 exchangeCodeForSession 에러 시 'fail' *\/
 *     result: "ok" | "fail";
 *     /** `?from` 쿼리 값. 없으면 null. 'signup' 외 값은 무시. *\/
 *     from: string | null;
 *     /** 성공 + 운영자 화이트리스트 통과 여부. fail 일 때는 무시. *\/
 *     isOperator: boolean;
 *     /** `?next` 쿼리 값 — safeNext 통과한 안전 path 또는 '/' fallback. *\/
 *     next: string;
 *   };
 *
 *   /** 콜백 라우트가 NextResponse.redirect(...) 할 path 를 결정 *\/
 *   export function resolveCallbackTarget(input: CallbackInput): string;
 *
 * 결정 규칙:
 *   - result='fail' + from='signup'  → '/signup?error=oauth_failed'
 *   - result='fail' + from!=='signup'  → '/login?error=oauth_failed'
 *   - result='ok'   → next (proxy 가드가 추가 분기)
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 가 아직 작성하지 않은 모듈 — 빨강 보장
import { resolveCallbackTarget } from "@/lib/auth/callback";

describe("resolveCallbackTarget — OAuth 콜백 redirect 분기 (D4)", () => {
  describe("OAuth 실패", () => {
    it("?from=signup → /signup?error=oauth_failed", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        from: "signup",
        isOperator: false,
        next: "/",
      });
      expect(target).toBe("/signup?error=oauth_failed");
    });

    it("?from 없음 (null) → /login?error=oauth_failed", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        from: null,
        isOperator: false,
        next: "/",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("?from 이 다른 값 → /login?error=oauth_failed (signup 외는 무시)", () => {
      const target = resolveCallbackTarget({
        result: "fail",
        from: "operator",
        isOperator: false,
        next: "/",
      });
      expect(target).toBe("/login?error=oauth_failed");
    });

    it("?from=signup 이면 isOperator 값 상관없이 /signup 으로", () => {
      // 가입자가 운영자 이메일을 쓰는 우연 + OAuth 실패 — from 우선
      const target = resolveCallbackTarget({
        result: "fail",
        from: "signup",
        isOperator: true,
        next: "/",
      });
      expect(target).toBe("/signup?error=oauth_failed");
    });
  });

  describe("OAuth 성공", () => {
    it("성공 + from=signup → next (proxy 가드가 추가 분기 결정)", () => {
      const target = resolveCallbackTarget({
        result: "ok",
        from: "signup",
        isOperator: false,
        next: "/",
      });
      expect(target).toBe("/");
    });

    it("성공 + 운영자 → next 그대로 (운영자 라우팅은 proxy 가드 책임)", () => {
      const target = resolveCallbackTarget({
        result: "ok",
        from: null,
        isOperator: true,
        next: "/",
      });
      expect(target).toBe("/");
    });

    it("성공 + next 가 별도 지정되면 그 값으로", () => {
      const target = resolveCallbackTarget({
        result: "ok",
        from: null,
        isOperator: false,
        next: "/me",
      });
      expect(target).toBe("/me");
    });
  });
});
