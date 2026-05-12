import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { PreferencesForm } from "@/app/onboarding/preferences/preferences-form";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/me/preferences` — "이런 분이면 좋겠어요" 수정.
 * 폼은 온보딩 Step 2 의 `PreferencesForm` 재사용.
 *
 * TODO(worker, task-C):
 *  - requireUser({ status: "approved" })
 *  - friend_ideals(1:1) + 1:N 4개 + priorities top 3 fetch → defaultValues 로 주입
 *  - PreferencesForm action 을 `/me/preferences` update action 으로 분기
 *  - 제출 후 `/me` 로 redirect
 */
export default function MePreferencesPage() {
  return (
    <UserShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/me"
            className="text-[11px] text-[var(--color-fg-muted)] hover:text-fg"
          >
            ← 내 페이지
          </Link>
        </div>
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            이런 분이면 좋겠어요
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            언제든 보강할 수 있어요. 자세할수록 매칭 정확도 ↑
          </p>
        </header>
        {/* TODO(worker): defaultValues 로 기존 응답 prefill */}
        <PreferencesForm />
      </div>
    </UserShell>
  );
}
