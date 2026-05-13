import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallbackTarget } from "@/lib/auth/callback";

/**
 * V2 OAuth 콜백 (010-v2-unified-login 통합 후).
 *
 * V1 처럼 화이트리스트 미통과 사용자를 signOut + /login 으로 튕기지 않는다.
 * 운영자도 가입자도 모두 OAuth 인증을 거쳐 `next` (기본 `/me`) 로 보내고,
 * proxy 가드가 실제 라우팅을 결정한다 (PRD §5.5):
 *   - 운영자 → /
 *   - 가입자 (friends row 없음) → /onboarding/profile
 *   - 가입자 (status=pending) → /onboarding/* 또는 /pending
 *   - 가입자 (status=approved) → /me
 *   - 가입자 (status=rejected) → /rejected
 *
 * OAuth 실패 시: /login?error=oauth_failed 로 일관 fallback (010 §D3).
 * V2.1 의 `?from=signup` round-trip 은 /signup 폐기로 의미 사라져 제거됨.
 */

/**
 * `next` 파라미터 검증 — open redirect 차단.
 * 같은 origin 의 path-only redirect 만 허용. `//evil.com`, `/\evil.com`,
 * `https://evil.com` 같은 외부/protocol-relative 경로는 `/me` 로 fallback.
 *
 * 010 §D3 — `/me` sentinel: 운영자면 가드가 `/` 로, 가입자면 status 보고 실제 path 로
 * 한 번 더 redirect. 가드 단일 진실원 정신과 정합.
 */
function safeNext(raw: string | null): string {
  const fallback = "/me";
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/\\")) return fallback;
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    const target = resolveCallbackTarget({
      result: "fail",
      isOperator: false,
      next,
    });
    return NextResponse.redirect(new URL(target, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const target = resolveCallbackTarget({
      result: "fail",
      isOperator: false,
      next,
    });
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 운영자 / 가입자 분기는 proxy 가드에 위임.
  const target = resolveCallbackTarget({
    result: "ok",
    isOperator: false,
    next,
  });
  return NextResponse.redirect(new URL(target, request.url));
}
