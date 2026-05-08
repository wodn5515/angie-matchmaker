import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvitationByToken } from "@/lib/db/invitations";
import { OPERATOR_DISPLAY_NAME } from "@/lib/auth/operator";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SurveyLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getInvitationByToken(token);
  if (!bundle) notFound();

  if (bundle.invitation.status === "completed") {
    return <ExpiredScreen />;
  }
  if (bundle.chapters.length === 0 || bundle.questions.length === 0) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-semibold">설문이 아직 준비 중이에요</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {OPERATOR_DISPLAY_NAME}이(가) 곧 다시 알려줄 거예요.
        </p>
      </main>
    );
  }

  // Find first chapter that has any unanswered question, else first chapter.
  const ansByQ = new Map(
    bundle.answers.map((a) => [a.question_id, a.value]),
  );
  let firstUnansweredChapterIdx = 0;
  for (let i = 0; i < bundle.chapters.length; i++) {
    const ch = bundle.chapters[i];
    const qs = bundle.questions.filter((q) => q.chapter_id === ch.id);
    const anyMissing = qs.some((q) => {
      const v = ansByQ.get(q.id);
      return v == null || v === "" || (Array.isArray(v) && v.length === 0);
    });
    if (anyMissing) {
      firstUnansweredChapterIdx = i;
      break;
    }
    if (i === bundle.chapters.length - 1) {
      // All chapters answered — go to last chapter (with submit button)
      firstUnansweredChapterIdx = i;
    }
  }

  const totalChapters = bundle.chapters.length;
  const totalQuestions = bundle.questions.length;
  const answered = bundle.questions.filter((q) => {
    const v = ansByQ.get(q.id);
    return !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
  }).length;
  const isResume = answered > 0;

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎀</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          안녕, <span className="text-pink-400">{bundle.friend.name}</span>!
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {OPERATOR_DISPLAY_NAME}이(가) 보낸 설문이야 ✨
          <br />
          편한 마음으로 답해줘!
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-pink-500/20 bg-[var(--color-surface)]/60 p-5 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-[11px] text-[var(--color-fg-muted)]">챕터</p>
            <p className="mt-0.5 text-xl font-semibold">{totalChapters}개</p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--color-fg-muted)]">총 문항</p>
            <p className="mt-0.5 text-xl font-semibold">{totalQuestions}개</p>
          </div>
        </div>
        {isResume ? (
          <div className="mt-4 rounded-lg border border-pink-500/30 bg-pink-500/5 px-3 py-2 text-center text-xs text-pink-300">
            이어서 풀기 — {answered}/{totalQuestions} 응답됨
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Link
          href={`/s/${token}/${firstUnansweredChapterIdx}`}
          className="block"
        >
          <Button size="lg" className="w-full">
            {isResume ? "이어서 시작 →" : "시작하기 →"}
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-center text-[11px] text-[var(--color-fg-subtle)]">
        답변은 자동 저장됩니다. 중간에 닫아도 같은 링크로 이어 풀 수 있어요.
      </p>
    </main>
  );
}

function ExpiredScreen() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-5xl">✨</div>
      <h1 className="mt-3 text-xl font-semibold">이미 답변이 완료된 설문이에요</h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        고생했어요! 한 번만 응답할 수 있는 링크라서 더 이상 진행할 수 없어요.
      </p>
    </main>
  );
}
