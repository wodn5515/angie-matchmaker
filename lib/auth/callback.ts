/**
 * OAuth 콜백 redirect target 결정 — 순수 함수.
 *
 * 결정 로그:
 *   - docs/decisions/007-v2-1-review-followup.md §D4 (시간순 — 도입 시점)
 *   - docs/decisions/010-v2-unified-login.md §D3·§D4 (현재 — `from` 제거)
 *
 * V2.1 단계에선 `?from=signup` 1-bit hint 로 콜백 실패 시 `/signup?error=oauth_failed` vs
 * `/login?error=oauth_failed` 를 분기했다. 010 결정으로 `/signup` 라우트가 폐기되고
 * `/login` 으로 진입점이 단일화되면서 `from` 파라미터의 retroactive 의미가 사라졌다.
 *
 * 새 시그니처는 OAuth 결과 + 운영자 여부 + `?next` 만 받아 단순화:
 *
 *   - result='fail'                 → '/login?error=oauth_failed' (항상)
 *   - result='ok'                   → next 그대로 (proxy 가드가 friends row 보고 최종 분기)
 *
 * 콜백은 더 이상 운영자/가입자 분기를 자체 결정하지 않는다 — proxy 가드를 단일
 * 진실원으로 두는 008 §D1 정신과 정합. route.ts 가 호출한다.
 */

export type CallbackInput = {
  /** OAuth 결과 — code 누락 또는 exchangeCodeForSession 에러 시 'fail' */
  result: "ok" | "fail";
  /** 성공 + 운영자 화이트리스트 통과 여부. fail 일 때는 무시. */
  isOperator: boolean;
  /** `?next` 쿼리 값 — safeNext 통과한 안전 path. 기본 '/me'. */
  next: string;
};

/**
 * 콜백 라우트가 NextResponse.redirect(...) 할 path 를 결정.
 */
export function resolveCallbackTarget(input: CallbackInput): string {
  if (input.result === "fail") {
    return "/login?error=oauth_failed";
  }
  return input.next;
}
