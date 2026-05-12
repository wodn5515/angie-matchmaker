import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 3 (선택 — skip 가능).
 * PRD §3.1.2 + §3.3.4 — 연애 성향 테스트 (V1 표준 설문 시스템 재활용).
 *
 * 진행 자체는 `/me/survey` 와 동일한 챕터 runner 를 공유. 디자이너는 진입 carousel 만 잡고
 * worker 가 chapter runner 컴포넌트 (`survey-runner`) 를 별도로 작성/이식한다.
 *
 * TODO(worker, task-B):
 *  - requireUser() + onboarding_step >= 3 검증
 *  - 표준 설문 (`surveys.type='standard'`) 의 챕터/문항 fetch
 *  - 자동 저장 + 마지막 챕터 제출 시 onboarding_step=null (= done) 갱신
 *  - V1 의 `app/s/[token]/[chapter]/page.tsx` 의 자동저장 로직을 OAuth 진입으로 변환
 *  - 완료 후 `/me` 로 redirect
 */
export default function OnboardingSurveyPage() {
  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={2}
          emoji="💌"
          title="연애 성향 테스트"
          subtitle="짧은 챕터 식 질문들이에요. 중간에 닫아도 자동 저장돼요."
        />

        {/*
          TODO(worker): 실제 챕터 runner.
          V1 의 friend-side chapter UX 를 OAuth 진입으로 재활용 (PRD §12 재활용 목록).
        */}
        <section className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-5 text-center text-sm text-[var(--color-fg-muted)]">
          {/* TODO 골격 — worker 가 챕터 runner 로 교체 */}
          <p className="text-fg text-base font-semibold">
            준비된 챕터들을 풀어볼까요?
          </p>
          <p className="mt-2 leading-relaxed">
            응답한 만큼 운영자가 더 정확하게 매칭해줄 수 있어요.
            <br />
            짧으면 5분, 길면 10분 정도 걸려요.
          </p>
        </section>

        <div className="space-y-3">
          {/* TODO(worker): 첫 챕터 진입 경로로 교체 */}
          <Link href="#todo-first-chapter">
            <Button size="lg" className="w-full">
              시작하기 →
            </Button>
          </Link>
          {/* TODO(worker): skip 후 /me 로 */}
          <form action="#todo-skip-survey-action">
            <Button type="submit" variant="ghost" className="w-full">
              나중에 할게요 → 내 페이지로
            </Button>
          </form>
        </div>
      </div>
    </UserShell>
  );
}
