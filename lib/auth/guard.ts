/**
 * V2 라우팅 가드 — 순수 함수.
 *
 * PRD §5.5 — OAuth 인증 × OPERATOR_EMAIL 화이트리스트 × friends row × status 매트릭스에서
 * 다음 경로로 어떻게 분기해야 하는지 결정한다. proxy.ts 가 이 함수를 호출하고 실제
 * NextResponse.redirect / next() 로 변환한다.
 *
 * 순수 함수로 분리해 단위 테스트(`tests/unit/proxy.test.ts`) 가능하게 했다.
 *
 * 010-v2-unified-login: `/signup` 라우트 폐기 + `/login` 단일 진입점 통합.
 *   - `PRE_AUTH_PUBLIC` 에서 `/signup` 제거 — `/login` 한 라우트만 공개
 *   - 폐기된 `/signup` path 진입 시 비로그인은 `/login`, 운영자는 `/` 로 흡수 (외부 링크 호환)
 *   - 비로그인이 가입자 라우트(/me, /onboarding) 진입 시 `/login` 으로 redirect (이전엔 `/signup`)
 *
 * 013-pending-deprecation: `/pending` 라우트 폐기 + `/me` 흡수.
 *   - PENDING_PREFIX 는 announcement 분기에서 제거 — `/rejected` 만 announcement 자격 유지
 *   - pending+null × `/pending`/`/onboarding/*`/그 외 → 모두 `/me` 로 흡수 (이전: pass / `/pending`)
 *   - 비로그인 × `/pending` → `/login` 으로 흡수 (이전: pass — announcement 자격 박탈)
 *   - rejected / approved / 운영자 × `/pending` 은 각 분기 fallback 으로 자연 흡수 (회귀 유지)
 *   - `requireOnboardedUser` 의 resume fallback (`?? "/pending"`) 도 같은 PR 에서 `/me` 로 갱신
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
/** 010 §D1 — `/login` 단일 진입점 (이전: ["/signup", "/login"]). */
const PRE_AUTH_PUBLIC = ["/login"];
/**
 * 폐기된 V2.x 라우트 — 외부 링크/북마크 호환을 위해 가드 단에서 흡수.
 *   - `/signup` (010 §D1) → 비로그인 `/login`, 운영자 `/`, 가입자는 각 상태 분기로
 *   - `/pending` (013 §D1) → 동일 흡수 패턴
 */
const LEGACY_GONE_ROUTES = ["/signup", "/pending"];
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

function isLegacyGone(pathname: string): boolean {
  return isAnyOf(pathname, LEGACY_GONE_ROUTES);
}

/**
 * 비로그인 진입을 허용하는 안내(공개) 라우트.
 *
 * 013 §D1 — `/pending` 라우트 폐기. 이제 `/rejected` 만 비로그인 외부 링크 안내 자격.
 * `/pending` 으로 들어온 비로그인은 통합 진입점 `/login` 으로 흡수된다 (다음 hop 으로
 * 가드가 자연 재평가).
 */
function isAnnouncementRoute(pathname: string): boolean {
  return isPathOrPrefix(pathname, REJECTED_PREFIX);
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
    // 010 §D1 — 가입자 라우트 / 운영자 라우트 / 폐기된 `/signup` 모두 통합 진입점 `/login` 으로.
    // 013 §D1 — 폐기된 `/pending` 도 announcement 자격 박탈로 같은 분기 흡수.
    return { type: "redirect", to: "/login" };
  }

  // ── OAuth + 운영자 ──────────────────────────────────────
  if (isOperator) {
    // 010 §D1 / 013 §D1 — 폐기된 `/signup`·`/pending` 진입은 운영자 대시보드 `/` 로 흡수.
    if (isLegacyGone(pathname)) {
      return { type: "redirect", to: "/" };
    }
    // 가입자 라우트 / 안내 페이지 / 로그인 페이지 진입 → / (운영자 대시보드)
    if (
      isPathOrPrefix(pathname, ME_PREFIX) ||
      isPathOrPrefix(pathname, ONBOARDING_PREFIX)
    ) {
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
      // 013 §D1 — fallback `/pending` → `/me`. step=null 케이스 외엔 resolve 함수가
      // 항상 string 을 반환하므로 fallback 발화는 사실상 방어용.
      const resumeTarget = resolveOnboardingResumeTarget({ friend }) ?? "/me";
      return { type: "redirect", to: resumeTarget };
    }
    // 온보딩 완료 + 심사 대기 — 011 §D1 — /me/* 진입을 허용해 안내 ↔ 동작 mismatch 해소.
    // 013 §D1 — `/pending` 라우트 폐기. PENDING_PREFIX pass 행 제거 + default fallback `/me`.
    if (isPathOrPrefix(pathname, ME_PREFIX)) return { type: "pass" };
    return { type: "redirect", to: "/me" };
  }

  // status === "approved"
  // approved 는 /me/* 만 통과. 그 외 (/onboarding/* / /pending / /rejected / 운영자 path)
  // 는 모두 /me 로 리다이렉트 — 008 §D1·D2 (사용자 보고 무한 체인 + 운영자 path 진입 시
  // /login 으로 잘못 가는 버그 fix).
  if (isPathOrPrefix(pathname, ME_PREFIX)) return { type: "pass" };
  return { type: "redirect", to: "/me" };
}
