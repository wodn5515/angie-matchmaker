import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveGuardTarget } from "@/lib/auth/guard";
import { buildRedirectUrl, isAuthPath } from "@/lib/supabase/redirect";

/**
 * V2 라우트 가드 + Supabase 세션 cookie 갱신을 한 번에 처리한다.
 *
 * PRD §5.5 — OAuth × OPERATOR_EMAIL × friends.status 매트릭스로 라우팅 분기.
 * 인증 결정은 순수 함수 `resolveGuardTarget` 에 위임하고, 여기서는:
 *   1) Supabase 세션 토큰 refresh
 *   2) user 정보 + (가입자라면) friends row 조회
 *   3) guard 결과로 redirect 또는 next() 반환
 *
 * 조회는 publishable key 클라이언트로 진행하지만 friends 테이블은 RLS deny-all 이므로
 * 직접 select 가 막힌다. proxy 단계에서 친구 row 가 필요할 때는 service-role
 * fetch 를 우회 호출. 대규모 트래픽 가정이 아니므로 단순 캐시 없이 매 요청 조회.
 */

const OPERATOR_EMAILS: string[] = (process.env.OPERATOR_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isOperator(email: string | null | undefined): boolean {
  if (!email) return false;
  if (OPERATOR_EMAILS.length === 0) return false;
  return OPERATOR_EMAILS.includes(email.toLowerCase().trim());
}

function publishableKey(): string {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  return v;
}

function secretKey(): string {
  const v =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) throw new Error("SUPABASE_SECRET_KEY is not set");
  return v;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // /auth + /auth/* (OAuth callback / signout) 은 가드 자체가 always pass 분기 —
  // 추가 조회 X. 세션 refresh 도 callback 라우트가 exchangeCodeForSession 에서 자체 처리.
  // D9 — root `/auth` 도 sub-path 와 동일하게 매치 (가드 isPathOrPrefix 와 일관성).
  const pathname = request.nextUrl.pathname;
  if (isAuthPath(pathname)) {
    return response;
  }

  // 세션 refresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOp = isOperator(user?.email);

  // 가입자라면 friends row 조회 (service-role — RLS 우회).
  // 비로그인 / 운영자 / 비-가드 라우트는 friend fetch 생략 — 불필요한 DB RTT 회피.
  let friendRow: {
    status: "pending" | "approved" | "rejected";
    onboarding_step: 1 | 2 | 3 | null;
  } | null = null;
  if (user?.id && !isOp) {
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secretKey(),
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      },
    );
    const { data } = await serviceClient
      .from("friends")
      .select("status, onboarding_step")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (data) {
      friendRow = {
        status: data.status,
        onboarding_step: data.onboarding_step,
      };
    }
  }

  const target = resolveGuardTarget({
    pathname,
    user: user?.email ? { email: user.email } : null,
    isOperator: isOp,
    friend: friendRow,
  });

  if (target.type === "redirect") {
    // D6 — 원본 search 보존 전략. `?error=oauth_failed` 등 안내 param 이 살아남는다.
    const url = request.nextUrl.clone();
    const built = buildRedirectUrl({
      originalSearch: request.nextUrl.search,
      targetPath: target.to,
    });
    url.pathname = built.pathname;
    url.search = built.search;
    return NextResponse.redirect(url);
  }

  return response;
}
