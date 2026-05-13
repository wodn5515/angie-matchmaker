/**
 * D6 — proxy.ts redirect 시 query string 보존 + `/auth` prefix 일관성 단위 테스트.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D6, §D9
 *
 * 현재 proxy.ts 는 `url.search = ""` 로 일괄 제거. `?error=...` 같은 안내 param 도
 * 함께 사라져 OAuth 콜백 → /login?error=oauth_failed 같은 흐름이 우연히만 작동.
 * 명시적으로 보존하는 게 안전.
 *
 * 추가: `/auth` prefix — 현재 `pathname.startsWith("/auth/")` 만 체크해 정확히 `/auth`
 * 는 친구 fetch 가 일어남 (auth root path 가 사실상 없지만, guard 와 일관성 위해 통일).
 *
 * worker 가 채울 인터페이스 (순수 함수 — proxy.ts 에서 분리):
 *
 *   // 위치: lib/supabase/proxy.ts 의 helper 로 export 또는 lib/supabase/redirect.ts 분리
 *   //   Lead 자율 채택 — spec 은 import path 만 변경 가능.
 *   export type RedirectBuildInput = {
 *     /** 원본 요청 URL 의 search 영역 (예: "?error=oauth_failed&next=/me") *\/
 *     originalSearch: string;
 *     /** 가드가 결정한 redirect target path *\/
 *     targetPath: string;
 *   };
 *
 *   /** redirect 시 원본 search 를 보존할 것이냐 결정 + 최종 path+search 반환 *\/
 *   export function buildRedirectUrl(input: RedirectBuildInput): {
 *     pathname: string;
 *     search: string;
 *   };
 *
 *   /** /auth root path + /auth/* 모두를 매치 — proxy 가 friend fetch 를 건너뛰는 조건 *\/
 *   export function isAuthPath(pathname: string): boolean;
 *
 * 보존 규칙 (Lead 자율 — worker 채택):
 *   - `error` param 은 보존 (?error=oauth_failed)
 *   - `next` param 은 redirect target 에 따라 — 단순히 다 보존해도 안전 (가드 target 이
 *     의미를 가지지 않으면 무시되므로)
 *   - 일관 보존 전략: search 가 비어있지 않으면 그대로 부착
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 가 아직 작성하지 않은 모듈 — 빨강 보장
import { buildRedirectUrl, isAuthPath } from "@/lib/supabase/redirect";

describe("buildRedirectUrl — redirect 시 query 보존 (D6)", () => {
  it("originalSearch 가 비어있으면 search 도 빈 문자열", () => {
    const result = buildRedirectUrl({
      originalSearch: "",
      targetPath: "/login",
    });
    expect(result.pathname).toBe("/login");
    expect(result.search).toBe("");
  });

  it("?error=oauth_failed 가 있으면 search 보존", () => {
    const result = buildRedirectUrl({
      originalSearch: "?error=oauth_failed",
      targetPath: "/login",
    });
    expect(result.pathname).toBe("/login");
    expect(result.search).toContain("error=oauth_failed");
  });

  it("?next=/me 도 보존 (가드가 의미 갖지 않으면 무시되므로 안전)", () => {
    // 010 §D1 — /signup 폐기 후 가입자 라우트 시도는 /login 으로 redirect.
    const result = buildRedirectUrl({
      originalSearch: "?next=/me",
      targetPath: "/login",
    });
    expect(result.pathname).toBe("/login");
    expect(result.search).toContain("next=/me");
  });

  it("복수 param 도 모두 보존", () => {
    // 010 통합: error 안내 + next 라우팅 hint 가 동시 보존되는 흐름.
    // (`from` allowlist 는 D6 호환 유지 차원에서 keep — 010 이후엔 사실상 의미 없음.)
    const result = buildRedirectUrl({
      originalSearch: "?error=oauth_failed&next=/me",
      targetPath: "/login",
    });
    expect(result.search).toContain("error=oauth_failed");
    expect(result.search).toContain("next=/me");
  });

  it("targetPath 자체에 query 가 있으면 (예: /login?error=...) 그대로 통과", () => {
    // 가드가 만약 path 와 search 를 합쳐서 줄 수도 있는데, 현재 결정 가드는 path 만 반환.
    // 단순화: targetPath 가 path-only 라고 가정. 만약 worker 가 다르게 구현해도 spec 은
    // 가드 결정 path 형태 (path-only) 기준.
    const result = buildRedirectUrl({
      originalSearch: "",
      targetPath: "/pending",
    });
    expect(result.pathname).toBe("/pending");
  });
});

describe("isAuthPath — /auth root + /auth/* prefix 일관성 (D9)", () => {
  it("/auth 정확 일치는 true", () => {
    expect(isAuthPath("/auth")).toBe(true);
  });

  it("/auth/callback 은 true", () => {
    expect(isAuthPath("/auth/callback")).toBe(true);
  });

  it("/auth/signout 은 true", () => {
    expect(isAuthPath("/auth/signout")).toBe(true);
  });

  it("/authentication 처럼 prefix 만 같은 다른 경로는 false (sub-path 가 아님)", () => {
    expect(isAuthPath("/authentication")).toBe(false);
  });

  it("/login 같은 무관 경로는 false", () => {
    expect(isAuthPath("/login")).toBe(false);
  });

  it("/ 루트는 false", () => {
    expect(isAuthPath("/")).toBe(false);
  });
});
