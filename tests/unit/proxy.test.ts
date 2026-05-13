/**
 * proxy.ts (Next.js 16 라우트 가드) — V2 인증·인가 매트릭스 단위 테스트.
 *
 * PRD §5.5 라우팅 가드 매트릭스를 모두 검증한다.
 *
 *   OAuth | OPERATOR_EMAIL | friends row | status   | 결과
 *   ------+----------------+-------------+----------+---------------------
 *    X    | —              | —           | —        | /login or /signup
 *    O    | ✓              | —           | —        | /(operator)/* OK
 *    O    | ✗              | 없음        | —        | /onboarding/profile
 *    O    | ✗              | 있음        | pending  | /pending 차단
 *    O    | ✗              | 있음        | rejected | /rejected 안내
 *    O    | ✗              | 있음        | approved | /me/* 정상
 *
 * 추가 엣지:
 *   - OAuth O + 화이트리스트 X + onboarding 진행 중 (step=2/3) → 해당 단계 라우트
 *   - 운영자가 /me/* 진입 시 / 로 리다이렉트 (운영자는 friends row 없음 — 가입자 라우트 부재)
 *   - 비로그인 사용자가 /signup 또는 /login 진입은 통과
 *   - /auth/callback 은 항상 통과 (OAuth 콜백)
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

    it("비로그인이 가입자 라우트 (/me) 진입 시 /signup 으로 리다이렉트", () => {
      const result = resolveGuardTarget({
        pathname: "/me",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "redirect", to: "/signup" });
    });

    it("비로그인이 /signup 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/signup",
        user: null,
        isOperator: false,
        friend: null,
      });
      expect(result).toEqual({ type: "pass" });
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

  describe("OAuth O + 가입자 + status=pending", () => {
    it("/me/* 진입 시 /pending 으로 차단", () => {
      const result = resolveGuardTarget({
        pathname: "/me/profile",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/pending" });
    });

    it("/pending 진입은 통과", () => {
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "pass" });
    });

    it("운영자 라우트 진입 시 /pending 으로 차단", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: { email: "user1@gmail.com" },
        isOperator: false,
        friend: { status: "pending", onboarding_step: null },
      });
      expect(result).toEqual({ type: "redirect", to: "/pending" });
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
