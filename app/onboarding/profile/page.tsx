import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import { OnboardingProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 1 (필수).
 * PRD §3.1.2 — 이름·성별·성취향·추천인(필수) + 9개 권장 필드(선택).
 *
 * TODO(worker, task-B):
 *  - requireUser() 헬퍼로 가입자 세션 검증, OAuth 안 됐으면 /signup 으로 redirect
 *  - 이미 friends row 가 있고 onboarding_step != 1 이면 다음 step 으로 redirect
 *  - 폼 제출 시 friends row insert (`status='pending'`, `onboarding_step=2`)
 *  - 제출 후 `/onboarding/preferences` 로 router.replace
 */
export default function OnboardingProfilePage() {
  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={0}
          emoji="🌸"
          title="내 프로필을 알려주세요"
          subtitle="필수 4가지만 채워도 다음 단계로 갈 수 있어요"
        />
        <OnboardingProfileForm />
      </div>
    </UserShell>
  );
}
