/**
 * OAuth 콜백 redirect target 결정 — 순수 함수.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D4
 *
 * 현재 콜백은 OAuth 실패 시 항상 `/login?error=oauth_failed` 로 보내, `/signup` 에서
 * 들어온 가입자가 운영자 진입 페이지로 가는 부조화. `/signup` 의 `signInWithOAuth`
 * 가 `redirectTo: ".../auth/callback?from=signup"` 으로 1-bit hint 를 넣고,
 * 콜백이 from 값으로 분기.
 *
 * route.ts 가 호출한다. 순수 함수로 분리해 단위 테스트
 * (tests/unit/auth-callback-redirect.test.ts) 가 가능.
 */

export type CallbackInput = {
  /** OAuth 결과 — code 누락 또는 exchangeCodeForSession 에러 시 'fail' */
  result: "ok" | "fail";
  /** `?from` 쿼리 값. 없으면 null. 'signup' 외 값은 무시. */
  from: string | null;
  /** 성공 + 운영자 화이트리스트 통과 여부. fail 일 때는 무시. */
  isOperator: boolean;
  /** `?next` 쿼리 값 — safeNext 통과한 안전 path 또는 '/' fallback. */
  next: string;
};

/**
 * 콜백 라우트가 NextResponse.redirect(...) 할 path 를 결정.
 *
 * - fail + from='signup' → /signup?error=oauth_failed
 * - fail + 그 외        → /login?error=oauth_failed
 * - ok                  → next (proxy 가드가 추가 분기)
 */
export function resolveCallbackTarget(input: CallbackInput): string {
  if (input.result === "fail") {
    if (input.from === "signup") {
      return "/signup?error=oauth_failed";
    }
    return "/login?error=oauth_failed";
  }
  return input.next;
}
