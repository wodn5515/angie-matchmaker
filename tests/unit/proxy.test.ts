/**
 * proxy.ts (Next.js 16 라우트 가드) — V2 인증·인가 매트릭스 단위 테스트.
 *
 * PRD §5.5 라우팅 가드 매트릭스를 모두 검증한다.
 *
 *   OAuth | OPERATOR_EMAIL | friends row | status   | 결과
 *   ------+----------------+-------------+----------+---------------------
 *    X    | —              | —           | —        | /login (통합 진입점)
 *    O    | ✓              | —           | —        | /(operator)/* OK
 *    O    | ✗              | 없음        | —        | /onboarding/profile
 *    O    | ✗              | 있음        | pending  | /pending 차단
 *    O    | ✗              | 있음        | rejected | /rejected 안내
 *    O    | ✗              | 있음        | approved | /me/* 정상
 *
 * 추가 엣지:
 *   - OAuth O + 화이트리스트 X + onboarding 진행 중 (step=2/3) → 해당 단계 라우트
 *   - 운영자가 /me/* 진입 시 / 로 리다이렉트 (운영자는 friends row 없음 — 가입자 라우트 부재)
 *   - 비로그인 사용자가 /login 진입은 통과 (010 §D1 이후 단일 진입점)
 *   - /auth/callback 은 항상 통과 (OAuth 콜백)
 *
 * 010-v2-unified-login: `/signup` 라우트 폐기 + `/login` 단일 진입점 통합.
 *   - `/signup` 은 더 이상 `PRE_AUTH_PUBLIC` 에 포함되지 않는다.
 *   - 비로그인이 가입자 라우트 (/me, /onboarding) 진입 시 `/login` 으로 redirect
 *     (이전엔 `/signup`).
 *
 * 013-pending-deprecation: `/pending` 라우트 폐기 + `/me` 흡수.
 *   - pending+step=null × `/pending` → redirect `/me` (이전: pass)
 *   - pending+step=null × `/onboarding/*` → redirect `/me` (이전: `/pending`)
 *   - pending+step=null × 운영자 path → redirect `/me` (이전: `/pending`)
 *   - 비로그인 × `/pending` → redirect `/login` (이전: pass — announcement 자격 박탈)
 *   - 회귀 유지: pending+step!=null × /me → onboarding resume / rejected × /pending → /rejected
 *     / approved × /pending → /me / 운영자 × /pending → / 모두 유지.
 *
 * 가드 함수 인터페이스 가정 (worker 가 채울 모듈):
 *   import { resolveGuardTarget } from "@/lib/auth/guard";
 *
 *   type GuardInput = {
 *     pathname: string;
 *     user: { email: string } | null;       // OAuth 세션
 *     isOperator: boolean;                  // OPERATOR_EMAIL 화이트리스트 통과 여부
 *     friend:
 *       | null                              // friends row 없음
 *       | {
 *           status: "pending" | "approved" | "rejected";
 *           onboarding_step: 1 | 2 | 3 | null;
 *         };
 *   };
 *
 *   type GuardTarget =
 *     | { type: "pass" }
 *     | { type: "redirect"; to: string };
 *
 *   function resolveGuardTarget(input: GuardInput): GuardTarget;
 *
 * worker 가 `proxy.ts` 의 `updateSession` 외에 위 순수 함수를 분리해
 * 단위 테스트 가능하게 만들어야 한다.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 가 아직 작성하지 않은 모듈 — 빨강 보장
import { resolveGuardTarget } from "@/lib/auth/guard";

describe("proxy 가드 — PRD §5.5 인증·인가 매트릭스", () => {
  describe("OAuth 인증 X (비로그인)", () => {
    it("비로그인이 운영자 라우트 진입 시 /login 으로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/login" });
    });

    it("비로그인이 가입자 라우트 (/me) 진입 시 /login 으로 리다이렉트 (010 통합 진입점)", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/login" });
    });

    it("비로그인이 가입자 온보딩 (/onboarding/profile) 진입 시 /login 으로 리다이렉트", () => {
      // 010 §D1 — `/signup` 폐기 후 가입자 라우트 시도도 통합 진입점 `/login` 으로.
      const result = resolveGuardTarget({
        pathname: "/onboarding/profile",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/login" });
    });

    it("비로그인이 /signup 진입 시 /login 으로 리다이렉트 (010 §D1 폐기 — 호환성)", () => {
      // 010 §D1 — 외부 링크/북마크 호환을 위해 `/signup` 은 가드 단에서 `/login` 으로
      // 흡수. `PRE_AUTH_PUBLIC` 에 `/signup` 이 더 이상 포함되지 않으므로 자동으로
      // "운영자 라우트" 분기로 들어가 `/login` 으로 redirect 됨 (또는 worker 가
      // 명시적 `/signup` → `/login` 분기를 추가해도 동일 결과).
      const result = resolveGuardTarget({
        pathname: "/signup",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/login" });
    });

    it("비로그인이 /login 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/login",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("비로그인이 /pending 진입 시 /login 으로 리다이렉트 (013 §D1 — 폐기된 라우트, announcement 자격 박탈)", () => {
      // 013 §D1 — `/pending` 라우트 폐기. PENDING_PREFIX 가 announcement 분기에서
      // 제거되므로 비로그인의 진입은 가입자/운영자 라우트와 동일하게 `/login` 으로 흡수.
      // 외부 링크/북마크 호환은 `/login` 진입 → 로그인 후 가드의 다음 hop 으로 자연 보존.
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/login" });
    });

    it("비로그인이 /rejected 진입은 통과 (013 §D1 — `/rejected` 만 announcement 로 유지)", () => {
      // 013 후속 영향 — announcement 라우트는 `/rejected` 만 남는다.
      // 비로그인의 외부 링크 진입은 안내 톤이 유지되어야 한다.
      const result = resolveGuardTarget({
        pathname: "/rejected",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/auth/callback 은 비로그인이어도 통과 (OAuth 콜백 처리)", () => {
      const result = resolveGuardTarget({
        pathname: "/auth/callback",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });
  });

  describe("OAuth O + 운영자 화이트리스트 통과", () => {
    it("운영자가 운영자 라우트 (/friends) 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("운영자가 대시보드 (/) 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("운영자가 비교 뷰 (/compare) 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/compare",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("운영자가 가입자 라우트 (/me) 진입 시 / 로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/" });
    });

    it("운영자가 가입자 온보딩 (/onboarding/profile) 진입 시 / 로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/profile",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/" });
    });

    it("운영자가 폐기된 /pending 진입 시 / 로 리다이렉트 (013 §D1 — 회귀 유지)", () => {
      // 013 §D1 매트릭스 — 운영자 × `/pending` 행은 그대로 `/` 흡수.
      // PENDING_PREFIX 가 isAnnouncementRoute 에서 빠져도, 운영자 분기의
      // "안내·로그인·가입자 라우트 모두 / 로" 경로로 자연 흡수.
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/" });
    });

    it("운영자가 폐기된 /signup 진입 시 / 로 리다이렉트 (010 §D1 호환)", () => {
      // 010 §D1 — `/signup` 라우트 폐기. 로그인된 운영자가 외부 링크/북마크로
      // 들어와도 운영자 대시보드 / 로 가는 게 자연.
      const result = resolveGuardTarget({
        pathname: "/signup",
        user: { email: "alice@gmail.com" },
        isOperator: true,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/" });
    });
  });

  describe("OAuth O + 화이트리스트 X (= 가입자) + friends row 없음", () => {
    it("/onboarding/profile 외 가입자 라우트 진입 시 /onboarding/profile 로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/onboarding/profile" });
    });

    it("/onboarding/profile 진입은 통과 (가입 1단계 진행)", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("운영자 라우트 (/friends) 진입 시 /onboarding/profile 로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/onboarding/profile" });
    });
  });

  describe("OAuth O + 가입자 + status=pending (온보딩 완료 — step=null)", () => {
    // 011 §D1 — 온보딩 완료(step=null) + 심사 대기 사용자에게 /me/* 도 열어준다.
    // 기존엔 모두 /pending 으로 redirect 됐던 행을 pass 로 뒤집는다.
    //
    // 013 §D1 — 추가 변경:
    //   - /pending 진입 → /me 로 redirect (이전: pass) — 라우트 자체 폐기
    //   - /onboarding/* 진입 → /me 로 redirect (이전: /pending) — fallback 변경
    //   - 운영자 path 진입 → /me 로 redirect (이전: /pending) — 그 외 분기 fallback 변경

    it("/pending 진입 시 /me 로 리다이렉트 (013 §D1 NEW — 라우트 폐기)", () => {
      // 013 §D1 — `/pending` 페이지 자체 삭제 + 가드가 URL 흡수. 외부 링크/북마크
      // 호환 보존을 위해 redirect 로만 처리 (가드 단계 흡수가 깔끔).
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/me 진입은 통과 (011 §D1 NEW)", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/me/profile 진입은 통과 (011 §D1 NEW)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/me/preferences 진입은 통과 (011 §D1 NEW)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/preferences",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/me/survey 진입은 통과 (011 §D1 NEW)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/survey",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/me/survey/0 (챕터 runner) 진입은 통과 (011 §D1 NEW)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/survey/0",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/onboarding/profile 진입은 /me 로 차단 (013 §D1 — 이전: /pending)", () => {
      // 013 §D1 매트릭스 — pending+null × /onboarding/* fallback 이 `/pending` 에서
      // `/me` 로 변경. resolveOnboardingResumeTarget 의 step=null 케이스가 null
      // 리턴이므로 호출처 (guard.ts) 의 `?? "/pending"` → `?? "/me"` 변경에 의존.
      const result = resolveGuardTarget({
        pathname: "/onboarding/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("운영자 라우트 (/friends) 진입 시 /me 로 차단 (013 §D1 — 이전: /pending)", () => {
      // 013 §D1 — pending+null × "그 외 보호 path" 의 default redirect target 이
      // `/pending` 에서 `/me` 로 변경 (라우트 폐기에 따른 fallback 단일화).
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });
  });

  describe("OAuth O + 가입자 + status=pending (온보딩 미완 — step != null) — 회귀 방지", () => {
    // 011 §D1 — onboarding_step != null 인 경우엔 그대로 onboarding resume 으로 보낸다.
    // 011 작업으로 절대 이 행이 함께 풀려선 안 된다.

    it("step=1 + /me 진입 시 /onboarding/profile 로 redirect (회귀 유지)", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 1 },
      });
      expect(result).toEqual({
        type: "redirect",
        to: "/onboarding/profile",
      });
    });

    it("step=2 + /me/profile 진입 시 /onboarding/preferences 로 redirect (회귀 유지)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 2 },
      });
      expect(result).toEqual({
        type: "redirect",
        to: "/onboarding/preferences",
      });
    });

    it("step=3 + /me/survey 진입 시 /onboarding/survey 로 redirect (회귀 유지)", () => {
      const result = resolveGuardTarget({
        pathname: "/me/survey",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 3 },
      });
      expect(result).toEqual({
        type: "redirect",
        to: "/onboarding/survey",
      });
    });
  });

  describe("OAuth O + 가입자 + status=rejected", () => {
    it("/me/* 진입 시 /rejected 로 차단", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "rejected", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/rejected" });
    });

    it("/rejected 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/rejected",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "rejected", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("rejected 가입자가 폐기된 /pending 진입 시 /rejected 로 리다이렉트 (013 §D1 — 회귀 유지)", () => {
      // 013 §D1 매트릭스 — rejected × `/pending` 행은 그대로 `/rejected` 흡수.
      // PENDING_PREFIX 가 announcement 분기에서 빠져도 rejected 분기가 우선해서
      // `/rejected` 외 모든 path 를 흡수해야 한다.
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "rejected", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/rejected" });
    });
  });

  describe("OAuth O + 가입자 + status=approved", () => {
    it("/me 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "approved", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("/me/profile 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/me/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "approved", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("승인된 가입자가 운영자 라우트 진입 시 /me 로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "approved", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("승인된 가입자가 폐기된 /pending 진입 시 /me 로 리다이렉트 (013 §D1 — 회귀 유지)", () => {
      // 013 §D1 매트릭스 — approved × `/pending` 행은 이전부터 `/me` 흡수였고
      // 본 결정에서도 동일하게 유지. PENDING_PREFIX 가 announcement 에서 빠져도
      // approved 분기의 default fallback `/me` 가 자연 흡수.
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "approved", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });
  });

  describe("온보딩 진행 중 이어풀기 (status=pending + onboarding_step)", () => {
    it("step=2 (preferences) 상태에서 /me 진입 시 /onboarding/preferences 로 라우팅", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 2 },
      });
      expect(result).toEqual({
        type: "redirect",
        to: "/onboarding/preferences",
      });
    });

    it("step=3 (survey) 상태에서 /me 진입 시 /onboarding/survey 로 라우팅", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 3 },
      });
      expect(result).toEqual({
        type: "redirect",
        to: "/onboarding/survey",
      });
    });

    it("step=2 진행 중 사용자가 /onboarding/preferences 본인 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/preferences",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: 2 },
      });
      expect(result).toEqual({ type: "pass" });
    });
  });
});
