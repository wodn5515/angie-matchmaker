import { redirect } from "next/navigation";
import { getOperatorOrNull } from "@/lib/auth/operator";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인 — matchmaker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const session = await getOperatorOrNull();
  if (session) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-400 text-2xl">
            ♥
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">matchmaker</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">
            운영자 전용 페이지입니다
          </p>
        </div>
        <LoginForm error={sp.error} reason={sp.reason} />
      </div>
    </main>
  );
}
