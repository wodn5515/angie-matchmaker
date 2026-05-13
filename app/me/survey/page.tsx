import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/user";
import { ensureStandardSurvey, listChapters, listQuestionsBySurvey } from "@/lib/db/surveys";
import { listAnswersForFriend } from "@/lib/db/answers";
import { SITE_OWNER_ID } from "@/lib/auth/operator";

export const dynamic = "force-dynamic";

/**
 * V2 `/me/survey` — 연애 성향 테스트 진입 / 재진입.
 * PRD §3.3.4 — V1 표준 설문 시스템 재활용 (토큰 진입 → OAuth 진입).
 *
 * 가입자가 본인 답변을 수정 가능 (1회용 제약 폐기).
 */
export default async function MeSurveyPage() {
  const session = await requireOnboardedUser();
  const standard = await ensureStandardSurvey(SITE_OWNER_ID);
  const [chapters, questions] = await Promise.all([
    listChapters(standard.id),
    listQuestionsBySurvey(standard.id),
  ]);
  const totalChapters = chapters.length;
  const totalQuestions = questions.length;
  const answers = await listAnswersForFriend(
    session.friendId,
    questions.map((q) => q.id),
  );
  const answered = answers.length;
  const isResume = answered > 0 && answered < totalQuestions;
  const isDone = totalQuestions > 0 && answered === totalQuestions;

  // 첫 미응답 챕터 (없으면 첫 챕터)
  const answeredIds = new Set(answers.map((a) => a.question_id));
  const questionsByChapter = new Map<string, typeof questions>();
  for (const q of questions) {
    const arr = questionsByChapter.get(q.chapter_id) ?? [];
    arr.push(q);
    questionsByChapter.set(q.chapter_id, arr);
  }
  const firstPendingChapter = chapters.find((c) => {
    const qs = questionsByChapter.get(c.id) ?? [];
    return qs.some((q) => !answeredIds.has(q.id));
  });
  const startChapter = firstPendingChapter ?? chapters[0];

  return (
    <UserShell>
      <div className="space-y-6">
        <Link
          href="/me"
          className="text-[11px] text-[var(--color-fg-muted)] hover:text-fg"
        >
          ← 내 페이지
        </Link>

        <header className="text-center space-y-2">
          <div className="text-4xl">💌</div>
          <h1 className="text-xl font-semibold tracking-tight">
            연애 성향 테스트
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            짧은 챕터 식 질문들이에요.
            <br />
            답변은 자동 저장돼요.
          </p>
        </header>

        <section className="rounded-2xl border border-pink-500/20 bg-[var(--color-surface)]/60 p-5 backdrop-blur-sm">
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
          ) : isDone ? (
            <div className="mt-4 rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-center text-xs text-[var(--color-success)]">
              ✅ 모든 문항 응답 완료
            </div>
          ) : null}
        </section>

        <div>
          {startChapter ? (
            <Link href={`/me/survey/${startChapter.id}`}>
              <Button size="lg" className="w-full">
                {isDone ? "다시 보기 →" : isResume ? "이어서 시작 →" : "시작하기 →"}
              </Button>
            </Link>
          ) : (
            <p className="text-center text-xs text-[var(--color-fg-muted)]">
              아직 준비된 설문이 없어요.
            </p>
          )}
        </div>
      </div>
    </UserShell>
  );
}
