import { OPERATOR_DISPLAY_NAME } from "@/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const sp = await searchParams;
  const name = sp.name?.trim();

  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-6xl animate-bounce">🎀</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        환영해{name ? `, ${name}` : ""}!
      </h1>
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
        등록 완료됐어요.
        <br />
        {OPERATOR_DISPLAY_NAME}이 잘 어울릴 사람을 찾아볼게 💞
      </p>
      <div className="mt-10 rounded-2xl border border-pink-500/20 bg-pink-500/5 px-5 py-4 text-[12px] text-[var(--color-fg-muted)]">
        이 링크는 더 이상 사용할 수 없어요.
        <br />
        창은 그냥 닫아도 괜찮아!
      </div>
    </main>
  );
}
