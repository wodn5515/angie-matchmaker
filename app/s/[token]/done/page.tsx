import { OPERATOR_DISPLAY_NAME } from "@/lib/auth/operator";
import { getInvitationByToken } from "@/lib/db/invitations";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DonePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getInvitationByToken(token);
  if (!bundle) notFound();
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-6xl animate-bounce">💞</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        모든 답변을 완료했어요!
      </h1>
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
        {bundle.friend.name}, 끝까지 답해줘서 정말 고마워.
        <br />
        {OPERATOR_DISPLAY_NAME}이(가) 잘 받아볼게 ✨
      </p>
      <div className="mt-10 rounded-2xl border border-pink-500/20 bg-pink-500/5 px-5 py-4 text-[12px] text-[var(--color-fg-muted)]">
        이 링크는 더 이상 사용할 수 없어요.
        <br />
        창은 그냥 닫아도 괜찮아!
      </div>
    </main>
  );
}
