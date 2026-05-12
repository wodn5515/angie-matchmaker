import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import { PreferencesForm } from "./preferences-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 2 (선택 — skip 가능).
 * PRD §3.3.3 — "이런 분이면 좋겠어요" 3단 구조.
 *
 * TODO(worker, task-B):
 *  - requireUser() + onboarding_step >= 2 검증
 *  - 폼 제출 시 friend_ideals(1:1) + 1:N 테이블에 upsert
 *  - skip 시에도 onboarding_step=3 으로 갱신
 *  - 제출/skip 후 `/onboarding/survey` 로 redirect
 */
export default function OnboardingPreferencesPage() {
  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={1}
          emoji="💞"
          title="이런 분이면 좋겠어요"
          subtitle="안 채워도 괜찮아요. 채울수록 매칭 정확도가 올라가요."
        />

        <PreferencesForm />

        {/* TODO(worker): skip action → onboarding_step 만 갱신하고 다음으로 */}
        <form action="#todo-skip-action">
          <Button type="submit" variant="ghost" className="w-full">
            지금은 건너뛸게요 →
          </Button>
        </form>
      </div>
    </UserShell>
  );
}
