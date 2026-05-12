import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { OnboardingProfileForm } from "@/app/onboarding/profile/profile-form";

export const dynamic = "force-dynamic";

/**
 * V2 가입자 `/me/profile` — 기본 정보 수정.
 * 폼 자체는 온보딩 Step 1 의 `OnboardingProfileForm` 을 재사용 (디자이너는 같은 골격을 유지).
 *
 * TODO(worker, task-C):
 *  - requireUser({ status: "approved" })
 *  - 본인 friends row 조회 → 폼 defaultValues 로 전달
 *  - `OnboardingProfileForm` 의 action 을 `/me/profile` 용 update action 으로 분기 (variant prop 추가)
 *  - 이메일 / auth_user_id 는 read-only 표시
 *  - 제출 후 `/me` 로 redirect
 */
export default function MeProfilePage() {
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
          <h1 className="text-xl font-semibold tracking-tight">내 프로필</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            언제든 수정할 수 있어요.
          </p>
        </header>
        {/* TODO(worker): variant="edit" + defaultValues prop 추가해서 재사용 */}
        <OnboardingProfileForm />
      </div>
    </UserShell>
  );
}
