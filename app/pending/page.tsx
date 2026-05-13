import { UserShell } from "@/components/user/user-shell";
import { StatusBanner } from "@/components/user/status-banner";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/pending` — 심사 대기 안내.
 * PRD §3.3.5 — "심사 중이에요. 운영자가 검토 후 알려드릴게요"
 *
 * TODO(worker, task-C):
 *  - requireUser() — status='pending' 인 가입자만 진입
 *  - status='approved' 면 /me 로, status='rejected' 면 /rejected 로 redirect
 */
export default function PendingPage() {
  return (
    <UserShell>
      <div className="space-y-6 py-6 text-center">
        <div className="text-6xl">⏳</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          심사 대기 중이에요
        </h1>
        <StatusBanner
          tone="pending"
          icon="🔍"
          title="운영자가 검토 중입니다"
          description="추천인 정보 + 본인 프로필을 보고 매칭 풀에 합류시킬지 결정해요. 결과가 나오면 운영자가 직접 안내드릴게요."
        />
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-5 py-4 text-left text-[12px] text-[var(--color-fg-muted)] space-y-2">
          <p className="text-fg text-sm font-semibold">기다리는 동안 할 수 있는 것</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>프로필을 조금 더 채워두면 심사가 빨라져요</li>
            <li>&ldquo;이런 분이면 좋겠어요&rdquo; 도 미리 작성 가능</li>
            <li>연애 성향 테스트도 진행해두면 좋아요</li>
          </ul>
        </div>
        <form action="/auth/signout" method="post">
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
