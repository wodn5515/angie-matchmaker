import Link from "next/link";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureStandardSurvey, listChapters } from "@/lib/db/surveys";
import { SITE_OWNER_ID } from "@/lib/auth/operator";
import { skipOnboardingSurveyAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 3 (선택 — skip 가능).
 * PRD §3.1.2 + §3.3.4 — 연애 성향 테스트 (V1 표준 설문 시스템 재활용).
 *
 * 챕터 runner 자체는 `/me/survey` 라우트가 담당. 여기서는 진입 / skip 카드만.
 */
export default async function OnboardingSurveyPage() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/signup");

  // 표준 설문 ensure (운영자 측 active standard 가 없다면 자동 생성)
  const standard = await ensureStandardSurvey(SITE_OWNER_ID);
  const chapters = await listChapters(standard.id);
  const firstChapter = chapters[0]?.id;

  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={2}
          emoji="💌"
          title="연애 성향 테스트"
          subtitle="짧은 챕터 식 질문들이에요. 중간에 닫아도 자동 저장돼요."
        />

        <section className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-5 text-center text-sm text-[var(--color-fg-muted)]">
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
          {firstChapter ? (
            <Link href={`/me/survey?chapter=${firstChapter}`}>
              <Button size="lg" className="w-full">
                시작하기 →
              </Button>
            </Link>
          ) : (
            <p className="text-center text-xs text-[var(--color-fg-muted)]">
              아직 준비된 설문이 없어요. 운영자에게 문의해주세요.
            </p>
          )}
          <form action={skipOnboardingSurveyAction}>
            <Button type="submit" variant="ghost" className="w-full">
              나중에 할게요 → 내 페이지로
            </Button>
          </form>
        </div>
      </div>
    </UserShell>
  );
}
