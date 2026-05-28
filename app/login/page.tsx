import { redirect } from "next/navigation";
import { getOperatorOrNull } from "@/lib/auth/operator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata = { title: "matchmaker 시작하기" };

/**
 * 010-v2-unified-login: `/signup` 폐기 + `/login` 단일 진입점 통합.
 * 운영자·가입자가 같은 화면에서 Google OAuth 로 진입하고, `/auth/callback` →
 * proxy 가드가 화이트리스트·friends row 보고 실제 라우팅 분기 (PRD §5.5).
 *
 * 카피 톤: "운영자 전용" → "모두 환영" — 처음 진입한 가입자에게도 어색하지 않게.
 *
 * 014 §D5 — `?deleted=1` query 가 정확히 "1" 일 때만 자가 탈퇴 안내 배너 노출.
 * 임의 query (`?deleted=any`) 우회 차단 (error / reason enum 화 패턴과 동일).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const session = await getOperatorOrNull();
  if (session) redirect("/");

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 space-y-3">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-400 text-2xl">
            ♥
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            matchmaker 시작하기
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
            Google 계정으로 로그인하세요.
            <br />
            처음이신가요? Google 로 시작하면 자동으로 가입이 진행돼요.
          </p>
        </div>
        {sp.deleted === "1" ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-pink-500/30 bg-pink-500/[0.08] px-4 py-3 text-xs leading-relaxed text-pink-300"
          >
            계정이 삭제됐어요. 다시 가입하려면 Google 로 로그인해주세요.
          </div>
        ) : null}
        <LoginForm error={sp.error} reason={sp.reason} />
      </div>
    </main>
  );
}
