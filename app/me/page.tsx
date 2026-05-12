import { UserShell } from "@/components/user/user-shell";
import { StatusBanner } from "@/components/user/status-banner";
import { MeSectionCard } from "@/components/user/me-section-card";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 대시보드.
 * PRD §3.3.1 + §6.3 — 자기 정보 요약 + 분기 카드 3개.
 *
 * TODO(worker, task-C):
 *  - requireUser() + status=approved 검증 (pending → /pending 으로 가드)
 *  - 본인 friends row + friend_ideals + survey_answers 조회
 *  - profile/preferences/survey 각 입력 완성도 계산 → 카드 status·강조 표시
 *  - 완성도 prop 으로 카드에 전달
 */
export default async function MePage() {
  // TODO(worker): 실제 데이터 fetch
  // const user = await requireUser({ status: "approved" });
  // const profileCompletion = ...; const hasIdeals = ...; const surveyDone = ...;

  // 디자이너 골격용 mock — worker 가 교체
  const userName = "민수";
  const profileCompletion: number = 8; // 13 중 8
  const profileMax: number = 13;
  const hasIdeals: boolean = false;
  const surveyDone: boolean = false;

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
          <StatusBanner
            tone="approved"
            icon="✅"
            title="승인됨 — 매칭 풀에 합류했어요"
            description="운영자가 잘 어울리는 분을 찾으면 카톡으로 알려드려요."
          />
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
                : profileCompletion >= 4
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
              hasIdeals
                ? undefined
                : "작성 안 하면 매칭 확률이 낮아져요"
            }
          />
          <MeSectionCard
            href="/me/survey"
            icon="💌"
            title="연애 성향 테스트"
            description="짧은 챕터 식 질문들"
            statusLabel={surveyDone ? "응답 완료" : "응답 안 함"}
            statusTone={surveyDone ? "success" : "warn"}
            highlight={!surveyDone}
            warningText={
              surveyDone
                ? undefined
                : "작성 안 하면 매칭 확률이 낮아져요"
            }
          />
        </div>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 text-[12px] text-[var(--color-fg-muted)]">
          <p>
            매칭은 운영자가 카톡으로 직접 안내해요. 사이트에서 따로 알림이 가지
            않으니 카톡을 확인해주세요.
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
