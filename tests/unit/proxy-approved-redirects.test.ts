/**
 * proxy 가드 — approved 가입자 × 라우트 매트릭스 누락 분기 단위 테스트.
 *
 * 결정 로그: docs/decisions/008-v2-routing-display-fixes.md §D1·D2
 *
 * ## 배경
 *
 * V2 가드 매트릭스 (PRD §5.5) 가 "기본 케이스" 만 명세하고 path-status 조합의
 * 엣지 케이스를 누락했다. 사용자 보고 (008 §배경):
 *
 *   "설문이 있는데 /onboarding/survey 에서 시작하기를 누르면 pending으로
 *    리다이렉트 됐다가 pending에서 다시 /onboarding/profile 로 리다이렉트 되는
 *    이상한 현상이 있고 거기다 이 유저는 이미 심사가 승인된 유저인데도 이렇게 돼.
 *    그리고 / 메인으로 왔을때 /login 으로 가버리는데 그건 운영자 전용페이지니까
 *    /me 로 가도록 해야하지 않을까?"
 *
 * ## 검증 분기
 *
 * **B1 (D1)** — approved 유저가 `/onboarding/*`·`/pending`·`/rejected` 진입 시
 *               `/me` 로 redirect (현재 구현은 onboarding 페이지로 잘못 보냄)
 * **B2 (D2)** — approved 유저가 `/(operator)` path (`/`, `/friends`, `/compare`,
 *               `/settings`, `/surveys/*`) 진입 시 `/me` 로 redirect
 *               (현재 일부 케이스는 `/login` 으로 잘못 보냄)
 *
 * `lib/auth/guard.ts` 의 `resolveGuardTarget` 시그니처는 그대로. 매트릭스 분기만
 * 확장한다.
 *
 * 기존 `tests/unit/proxy.test.ts` 22 케이스 회귀는 X — 이 spec 은 누락된 분기만 추가.
 */

import { describe, expect, it } from "vitest";
import { resolveGuardTarget } from "@/lib/auth/guard";

const APPROVED_FRIEND = {
  status: "approved" as const,
  onboarding_step: null,
};

const USER = { email: "user1@gmail.com" };

describe("proxy 가드 — approved 가입자 × 라우트 매트릭스 (D1·D2)", () => {
  describe("D1. approved 가 온보딩/안내 라우트 진입 시 /me 로", () => {
    it("/onboarding/profile 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/profile",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/onboarding/preferences 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/preferences",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/onboarding/survey 진입 시 /me 로 redirect (사용자 보고 무한 체인 방어)", () => {
      const result = resolveGuardTarget({
        pathname: "/onboarding/survey",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      // worker 자율: /me 또는 /me/survey. /me 가 기본값 — 008 §D1 의 단일 진실원 정신.
      // 더 자연스러운 후보는 /me/survey 지만 spec 은 /me 로 고정 (worker 가 더
      // 적절하다고 판단하면 Lead 에 보고).
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/pending 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/pending",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/rejected 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/rejected",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });
  });

  describe("D2. approved 가 운영자(/) 라우트 진입 시 /me 로", () => {
    it("/ (대시보드 루트) 진입 시 /me 로 redirect (사용자 보고: 현재 /login 으로 감)", () => {
      const result = resolveGuardTarget({
        pathname: "/",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/friends 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/friends",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/friends/<id> 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/friends/abc",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/compare 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/compare",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/settings 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/settings",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });

    it("/surveys/standard 진입 시 /me 로 redirect", () => {
      const result = resolveGuardTarget({
        pathname: "/surveys/standard",
        user: USER,
        isOperator: false,
        friend: APPROVED_FRIEND,
      });
      expect(result).toEqual({ type: "redirect", to: "/me" });
    });
  });
});
