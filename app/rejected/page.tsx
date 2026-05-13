import { UserShell } from "@/components/user/user-shell";
import { StatusBanner } from "@/components/user/status-banner";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/rejected` — 가입 거절 안내.
 * PRD §3.3.5 + D-004 — 거절 사유는 비공개 default.
 *
 * TODO(worker, task-C):
 *  - requireUser() — status='rejected' 가입자만 진입
 *  - rejected_reason 은 노출하지 않음 (운영자 비공개 메모)
 */
export default function RejectedPage() {
  return (
    <UserShell>
      <div className="space-y-6 py-6 text-center">
        <div className="text-6xl">🥲</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          가입이 어렵게 됐어요
        </h1>
        <StatusBanner
          tone="rejected"
          icon="📭"
          title="검토 결과 가입이 진행되지 않았어요"
          description="자세한 사유는 운영자에게 직접 문의해주세요. 사이트에서는 사유를 공개하지 않아요."
        />
        <p className="text-[12px] text-[var(--color-fg-subtle)] leading-relaxed">
          귀한 관심을 가져주셔서 감사해요.
          <br />
          더 나은 모습으로 또 만나길 바라요.
        </p>
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
