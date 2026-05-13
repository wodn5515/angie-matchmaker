import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallbackTarget } from "@/lib/auth/callback";

/**
 * V2 OAuth 콜백.
 *
 * V1 처럼 화이트리스트 미통과 사용자를 signOut + /login 으로 튕기지 않는다.
 * 운영자도 가입자도 모두 OAuth 인증을 거쳐 `/` 로 보내고, proxy 가드가
 * 실제 라우팅을 결정한다 (PRD §5.5):
 *   - 운영자 → /
 *   - 가입자 (friends row 없음) → /onboarding/profile
 *   - 가입자 (status=pending) → /onboarding/* 또는 /pending
 *   - 가입자 (status=approved) → /me
 *   - 가입자 (status=rejected) → /rejected
 *
 * OAuth 실패 시: `?from=signup` 이면 /signup?error=oauth_failed, 그 외 /login?error=oauth_failed
 * (decisions/007 §D4).
 */
/**
 * `next` 파라미터 검증 — open redirect 차단.
 * 같은 origin 의 path-only redirect 만 허용. `//evil.com`, `/\evil.com`,
 * `https://evil.com` 같은 외부/protocol-relative 경로는 `/` 로 fallback.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const from = url.searchParams.get("from");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    const target = resolveCallbackTarget({
      result: "fail",
      from,
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
      from,
      isOperator: false,
      next,
    });
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 운영자 / 가입자 분기는 proxy 가드에 위임.
  const target = resolveCallbackTarget({
    result: "ok",
    from,
    isOperator: false,
    next,
  });
  return NextResponse.redirect(new URL(target, request.url));
}
