import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/me/survey` — 연애 성향 테스트 진입/재진입.
 * PRD §3.3.4 — V1 표준 설문 시스템 재활용 (토큰 진입 → OAuth 진입).
 *
 * TODO(worker, task-C):
 *  - requireUser({ status: "approved" })
 *  - 표준 설문 chapters/questions/answers fetch
 *  - 첫 미응답 챕터로 자동 진입 (또는 마지막 챕터)
 *  - 챕터 runner 는 V1 의 `app/s/[token]/[chapter]/page.tsx` 골격을 OAuth 진입으로 재작성
 *  - survey_answers 키가 (friend_id, question_id) 로 변경됨 (PRD §4.6)
 */
export default function MeSurveyPage() {
  // TODO(worker): 실제 데이터 fetch + 진입 분기
  const totalChapters = 5;
  const totalQuestions = 30;
  const answered = 0;
  const isResume = answered > 0;

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
          ) : null}
        </section>

        <div>
          {/* TODO(worker): 첫 미응답 챕터 경로로 link 교체 */}
          <Link href="#todo-first-chapter">
            <Button size="lg" className="w-full">
              {isResume ? "이어서 시작 →" : "시작하기 →"}
            </Button>
          </Link>
        </div>
      </div>
    </UserShell>
  );
}
