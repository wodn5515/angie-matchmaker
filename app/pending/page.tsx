import { UserShell } from "@/components/user/user-shell";
import { StatusBanner } from "@/components/user/status-banner";
import { MeSectionCard } from "@/components/user/me-section-card";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/pending` — 심사 대기 안내.
 * PRD §3.3.5 — "심사 중이에요. 운영자가 검토 후 알려드릴게요"
 *
 * 011 §D3 — "기다리는 동안 할 수 있는 것" 안내문구를 클릭 가능한 액션 카드 3개로
 * 업그레이드. 011 §D1 으로 가드가 pending+step=null 가입자에게 `/me/*` 를 열어주므로
 * 안내 ↔ 동작 mismatch 가 해소된다.
 */
export default function PendingPage() {
  return (
    <UserShell>
      <div className="space-y-6 py-6">
        <div className="space-y-3 text-center">
          <div className="text-6xl">⏳</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            심사 대기 중이에요
          </h1>
        </div>

        <StatusBanner
          tone="pending"
          icon="🔍"
          title="운영자가 검토 중입니다"
          description="추천인 정보 + 본인 프로필을 보고 매칭 풀에 합류시킬지 결정해요. 결과가 나오면 운영자가 직접 안내드릴게요."
        />

        <section className="space-y-3">
          <p className="px-1 text-sm font-semibold text-fg">
            기다리는 동안 할 수 있는 것
          </p>
          <MeSectionCard
            href="/me/profile"
            icon="🌸"
            title="프로필 채우기"
            description="기본 정보를 더 채우면 심사가 빨라져요"
            statusLabel="시작하기 →"
            statusTone="pink"
            highlight
          />
          <MeSectionCard
            href="/me/preferences"
            icon="💞"
            title="이런 분이면 좋겠어요"
            description="선호 조건 · 성격 · 우선순위 미리 작성"
            statusLabel="시작하기 →"
            statusTone="pink"
            highlight
          />
          <MeSectionCard
            href="/me/survey"
            icon="💌"
            title="연애 성향 테스트 하기"
            description="짧은 챕터 식 질문 — 자동 저장돼요"
            statusLabel="시작하기 →"
            statusTone="pink"
            highlight
          />
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
