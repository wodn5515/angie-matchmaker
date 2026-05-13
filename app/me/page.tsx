import { UserShell } from "@/components/user/user-shell";
import { StatusBanner } from "@/components/user/status-banner";
import { MeSectionCard } from "@/components/user/me-section-card";
import { requireOnboardedUser } from "@/lib/auth/user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getFriendIdealAggregate } from "@/lib/db/ideals";
import { ensureStandardSurvey, listQuestionsBySurvey } from "@/lib/db/surveys";
import { listAnswersForFriend } from "@/lib/db/answers";
import { SITE_OWNER_ID } from "@/lib/auth/operator";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 대시보드.
 * PRD §3.3.1 + §6.3 — 본인 정보 요약 + 분기 카드 3개.
 *
 * proxy 가드 + `requireOnboardedUser` 가 status='approved' 또는
 * (status='pending' + onboarding_step=null) 가입자만 진입시킨다 (011 §D1·D2).
 * pending 가입자에게는 상단 배너로 심사 대기 안내 (011 §D4).
 */
export default async function MePage() {
  const user = await requireOnboardedUser();

  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select(
      "name, birth_year, region, hometown, occupation, instagram, relationship_status, match_interest",
    )
    .eq("id", user.friendId)
    .single();

  // 프로필 완성도 — 권장 7 + 필수 4(고정) + 추천인 2(필수) = 13
  // 필수는 이미 완료(가입 통과). 권장 7개 중 채운 갯수만 점수화.
  const optionalFields = [
    friend?.birth_year != null,
    !!friend?.region,
    !!friend?.hometown,
    !!friend?.occupation,
    !!friend?.instagram,
    friend?.relationship_status != null,
    friend?.match_interest != null,
  ];
  const optionalFilled = optionalFields.filter(Boolean).length;
  // 필수 5(이름·성별·선호 성별·추천인 이름·관계) 항상 채워짐 + 권장 7 → 12 만점 + 가입 자체 1 = 13
  const profileCompletion = 6 + optionalFilled;
  const profileMax = 13;

  // 이상형 작성 여부 — friend_ideals row 또는 1:N 중 하나라도 있으면 작성됨
  const ideal = await getFriendIdealAggregate(user.friendId);
  const hasIdeals =
    ideal.ideals !== null ||
    ideal.regions.length > 0 ||
    ideal.hometowns.length > 0 ||
    ideal.jobs.length > 0 ||
    ideal.personality_keywords.length > 0 ||
    ideal.priorities.length > 0;

  // 설문 응답 완성도
  const standard = await ensureStandardSurvey(SITE_OWNER_ID);
  const questions = await listQuestionsBySurvey(standard.id);
  const questionIds = questions.map((q) => q.id);
  const answers = await listAnswersForFriend(user.friendId, questionIds);
  const surveyDone = answers.length === questions.length && questions.length > 0;
  const surveyInProgress = answers.length > 0 && !surveyDone;

  const userName = friend?.name ?? "";

  return (
    <UserShell>
      <div className="space-y-6">
        <header className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              내 페이지
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              안녕하세요, <span className="text-pink-400">{userName}</span>님 🩷
            </h1>
          </div>
          {user.status === "pending" ? (
            <StatusBanner
              tone="pending"
              icon="🔍"
              title="심사 대기 중이에요"
              description="미리 채워두면 운영자가 더 빨리 검토해요. 결과가 나오면 직접 안내드릴게요."
            />
          ) : (
            <StatusBanner
              tone="approved"
              icon="✅"
              title="승인됨 — 매칭 풀에 합류했어요"
              description="운영자가 잘 어울리는 분을 찾으면 직접 안내드려요."
            />
          )}
        </header>

        <div className="space-y-3">
          <MeSectionCard
            href="/me/profile"
            icon="🌸"
            title="내 프로필"
            description="기본 정보 보기 / 수정"
            statusLabel={`${profileCompletion}/${profileMax} 채움`}
            statusTone={
              profileCompletion === profileMax
                ? "success"
                : profileCompletion >= 8
                  ? "neutral"
                  : "warn"
            }
          />
          <MeSectionCard
            href="/me/preferences"
            icon="💞"
            title="이런 분이면 좋겠어요"
            description="§1 선호 조건 / §2 성격·결 / §3 우선순위"
            statusLabel={hasIdeals ? "작성됨" : "아직 미작성"}
            statusTone={hasIdeals ? "success" : "warn"}
            highlight={!hasIdeals}
            warningText={
              hasIdeals ? undefined : "작성 안 하면 매칭 확률이 낮아져요"
            }
          />
          <MeSectionCard
            href="/me/survey"
            icon="💌"
            title="연애 성향 테스트"
            description={
              surveyInProgress
                ? `진행 중 — ${answers.length}/${questions.length}`
                : "짧은 챕터 식 질문들"
            }
            statusLabel={
              surveyDone
                ? "응답 완료"
                : surveyInProgress
                  ? "진행 중"
                  : "응답 안 함"
            }
            statusTone={surveyDone ? "success" : surveyInProgress ? "neutral" : "warn"}
            highlight={!surveyDone && !surveyInProgress}
            warningText={
              surveyDone ? undefined : "작성 안 하면 매칭 확률이 낮아져요"
            }
          />
        </div>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 text-[12px] text-[var(--color-fg-muted)]">
          <p>
            매칭은 운영자가 직접 안내해요. 사이트에는 따로 표시되지 않으니
            안내를 기다려주세요.
          </p>
        </section>

        <form action="/auth/signout" method="post" className="text-center">
          <button
            type="submit"
            className="text-[11px] text-[var(--color-fg-subtle)] hover:text-fg"
          >
            로그아웃
          </button>
        </form>
      </div>
    </UserShell>
  );
}
