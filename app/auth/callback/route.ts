import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOperatorEmail } from "@/lib/auth/operator";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Whitelist gate: anyone else is signed out and bounced to login.
  if (!isOperatorEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=not_operator", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
