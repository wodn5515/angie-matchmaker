/**
 * V2 라우팅 가드 — 순수 함수.
 *
 * PRD §5.5 — OAuth 인증 × OPERATOR_EMAIL 화이트리스트 × friends row × status 매트릭스에서
 * 다음 경로로 어떻게 분기해야 하는지 결정한다. proxy.ts 가 이 함수를 호출하고 실제
 * NextResponse.redirect / next() 로 변환한다.
 *
 * 순수 함수로 분리해 단위 테스트(`tests/unit/proxy.test.ts`) 가능하게 했다.
 */

import {
  resolveOnboardingResumeTarget,
  type OnboardingFriend,
} from "./onboarding";

export type GuardInput = {
  /** Next.js URL pathname (예: "/me/profile"). 쿼리스트링·해시 제외. */
  pathname: string;
  /** OAuth 세션 — 있으면 email 노출. */
  user: { email: string } | null;
  /** OPERATOR_EMAIL 화이트리스트 통과 여부. */
  isOperator: boolean;
  /**
   * 현재 user 의 friends row.
   *   - 비로그인이거나 운영자거나 row 가 없으면 null.
   *   - 있으면 status + onboarding_step 만 필요.
   */
  friend: OnboardingFriend | null;
};

export type GuardTarget =
  | { type: "pass" }
  | { type: "redirect"; to: string };

const AUTH_CALLBACK_PREFIX = "/auth";
const PRE_AUTH_PUBLIC = ["/signup", "/login"];
const PENDING_PREFIX = "/pending";
const REJECTED_PREFIX = "/rejected";
const ONBOARDING_PREFIX = "/onboarding";
const ME_PREFIX = "/me";

function isPathOrPrefix(pathname: string, target: string): boolean {
  if (pathname === target) return true;
  return pathname.startsWith(target + "/");
}

function isAnyOf(pathname: string, targets: string[]): boolean {
  return targets.some((t) => isPathOrPrefix(pathname, t));
}

function isSignupUserRoute(pathname: string): boolean {
  return (
    isPathOrPrefix(pathname, ME_PREFIX) ||
    isPathOrPrefix(pathname, ONBOARDING_PREFIX)
  );
}

function isAnnouncementRoute(pathname: string): boolean {
  return (
    isPathOrPrefix(pathname, PENDING_PREFIX) ||
    isPathOrPrefix(pathname, REJECTED_PREFIX)
  );
}

export function resolveGuardTarget(input: GuardInput): GuardTarget {
  const { pathname, user, isOperator, friend } = input;

  // /auth/* (OAuth 콜백·signout) 은 모든 상태에서 통과
  if (isPathOrPrefix(pathname, AUTH_CALLBACK_PREFIX)) {
    return { type: "pass" };
  }

  // ── 비로그인 ──────────────────────────────────────────────
  if (!user) {
    if (isAnyOf(pathname, PRE_AUTH_PUBLIC)) return { type: "pass" };
    if (isAnnouncementRoute(pathname)) return { type: "pass" };
    // 가입자 라우트 진입 시도 → /signup, 운영자 라우트 진입 시도 → /login
    if (isSignupUserRoute(pathname)) {
      return { type: "redirect", to: "/signup" };
    }
    return { type: "redirect", to: "/login" };
  }

  // ── OAuth + 운영자 ──────────────────────────────────────
  if (isOperator) {
    // 가입자 라우트 / 안내 페이지 / 로그인·가입 페이지 진입 → / (운영자 대시보드)
    if (isSignupUserRoute(pathname)) {
      return { type: "redirect", to: "/" };
    }
    if (isAnnouncementRoute(pathname)) {
      return { type: "redirect", to: "/" };
    }
    if (isAnyOf(pathname, PRE_AUTH_PUBLIC)) {
      return { type: "redirect", to: "/" };
    }
    return { type: "pass" };
  }

  // ── OAuth + 가입자 (화이트리스트 미통과) ────────────────
  if (!friend) {
    // friends row 없음 → /onboarding/profile 부터 시작
    if (pathname === "/onboarding/profile") return { type: "pass" };
    return { type: "redirect", to: "/onboarding/profile" };
  }

  if (friend.status === "rejected") {
    if (isPathOrPrefix(pathname, REJECTED_PREFIX)) return { type: "pass" };
    return { type: "redirect", to: "/rejected" };
  }

  if (friend.status === "pending") {
    // 온보딩 미완 (step != null) — /onboarding/* 진입은 자유 (이어풀기 또는 이전 단계 수정)
    if (friend.onboarding_step != null) {
      if (isPathOrPrefix(pathname, ONBOARDING_PREFIX)) return { type: "pass" };
      const resumeTarget =
        resolveOnboardingResumeTarget({ friend }) ?? "/pending";
      return { type: "redirect", to: resumeTarget };
    }
    // 온보딩 완료 + 심사 대기
    if (isPathOrPrefix(pathname, PENDING_PREFIX)) return { type: "pass" };
    return { type: "redirect", to: "/pending" };
  }

  // status === "approved"
  if (isSignupUserRoute(pathname)) return { type: "pass" };
  // 운영자 라우트나 /pending/rejected 안내 페이지 시도 → /me 로
  return { type: "redirect", to: "/me" };
}
