/**
 * proxy 의 redirect URL 빌더 + `/auth` prefix 일관성 헬퍼.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D6, §D9
 *
 * proxy.ts 가 `url.search = ""` 로 일괄 제거하면 `?error=...` 같은 안내 param 까지
 * 함께 사라져 OAuth 콜백 실패 흐름 (예: /login?error=oauth_failed) 이 우연히만 동작.
 * 명시적으로 원본 search 를 보존하는 전략을 채택.
 *
 * `/auth` prefix 는 가드와 일관성 위해 root `/auth` + sub-path `/auth/*` 모두 매치하는
 * 헬퍼 `isAuthPath` 로 통일.
 */

export type RedirectBuildInput = {
  /** 원본 요청 URL 의 search 영역 (예: "?error=oauth_failed&next=/me") */
  originalSearch: string;
  /** 가드가 결정한 redirect target path (path-only — query 포함 X) */
  targetPath: string;
};

/**
 * redirect 시 원본 search 를 보존할지 결정 + 최종 path + search 반환.
 *
 * 보존 전략: search 가 비어있지 않으면 그대로 부착.
 * - `error` 안내 param 이 살아남아 사용자에게 사유 표시 가능
 * - `next` 도 보존되지만 가드 target 이 이미 결정된 path 라 의미 무시
 *   (다음 사이클에서 가드가 다시 처리)
 */
export function buildRedirectUrl(input: RedirectBuildInput): {
  pathname: string;
  search: string;
} {
  const { originalSearch, targetPath } = input;
  return {
    pathname: targetPath,
    search: originalSearch ?? "",
  };
}

/**
 * `/auth` root path + `/auth/*` 모두를 매치 — proxy 가 friend fetch 를 건너뛰는 조건.
 *
 * 기존 `pathname.startsWith("/auth/")` 만으로는 정확히 `/auth` 경로가 누락.
 * guard 의 `isPathOrPrefix("/auth", ...)` 와 일관성 유지.
 *
 * `/authentication` 처럼 prefix 만 같은 다른 path 는 false.
 */
export function isAuthPath(pathname: string): boolean {
  if (pathname === "/auth") return true;
  return pathname.startsWith("/auth/");
}
