/**
 * proxy 의 redirect URL 빌더 + `/auth` prefix 일관성 헬퍼.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D6, §D9
 *
 * proxy.ts 가 `url.search = ""` 로 일괄 제거하면 `?error=...` 같은 안내 param 까지
 * 함께 사라져 OAuth 콜백 실패 흐름 (예: /login?error=oauth_failed) 이 우연히만 동작.
 * 명시적으로 원본 search 를 *선별* 보존하는 전략을 채택.
 *
 * 보존 정책 — allowlist 기반:
 *   - `error`: OAuth/가드 실패 사유 안내 (D4 와 직접 결합)
 *   - `next`: callback / guard 가 후속 사이클에서 다시 처리할 target path
 *   - `from`: D4 의 /signup vs /login 분기 hint
 *
 * 무관 param (`utm_source`, `ref`, 임의 query 등) 은 redirect 사이클에서 잘라낸다.
 * 사용자 종합 리뷰 라운드-4 의 🟢 #3 — `/me/profile?from=email-newsletter` 같은 임의
 * param 이 운영자 라우팅 redirect 에 살아남는 부조화를 차단.
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
 * D6 의 "보존 대상" 안내·라우팅 param key 집합.
 * 새 키 추가는 결정 로그 갱신 + 회귀 spec 동반 필수.
 */
const PRESERVE_KEYS: ReadonlySet<string> = new Set(["error", "next", "from"]);

/**
 * redirect 시 원본 search 중 `PRESERVE_KEYS` 의 param 만 살려 부착한다.
 *
 * - allowlist 외 param 은 drop (utm_*, ref, 임의 query 등)
 * - 키 디코딩 후 비교 — `%65rror` 같은 인코딩 우회는 허용 (정상 디코딩 결과가 `error`)
 * - 값 chunk 는 raw 형태 유지 — `?next=/me` 가 URLSearchParams 재인코딩으로 `%2Fme`
 *   되는 일을 회피 (가드의 다음 사이클에서 string-match 정합 유지)
 * - 보존할 key 가 하나도 없으면 빈 search 반환
 */
export function buildRedirectUrl(input: RedirectBuildInput): {
  pathname: string;
  search: string;
} {
  const { originalSearch, targetPath } = input;
  if (!originalSearch || originalSearch === "?") {
    return { pathname: targetPath, search: "" };
  }
  const trimmed = originalSearch.startsWith("?")
    ? originalSearch.slice(1)
    : originalSearch;
  const kept = trimmed
    .split("&")
    .filter((chunk) => chunk.length > 0)
    .filter((chunk) => {
      const eqIdx = chunk.indexOf("=");
      const rawKey = eqIdx >= 0 ? chunk.slice(0, eqIdx) : chunk;
      try {
        return PRESERVE_KEYS.has(decodeURIComponent(rawKey));
      } catch {
        // malformed percent-encoding — 안전하게 drop
        return false;
      }
    });
  if (kept.length === 0) {
    return { pathname: targetPath, search: "" };
  }
  return { pathname: targetPath, search: "?" + kept.join("&") };
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
