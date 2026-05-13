import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { OnboardingProfileForm } from "@/app/onboarding/profile/profile-form";
import { requireOnboardedUser } from "@/lib/auth/user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { updateMeProfileAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * V2 `/me/profile` — 승인된 가입자가 본인 프로필 수정.
 *
 * 폼은 온보딩 Step 1 의 `OnboardingProfileForm` 을 variant="edit" 으로 재사용.
 */
export default async function MeProfilePage() {
  const session = await requireOnboardedUser();
  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select(
      "name, gender, preferred_gender, recommender_name, recommender_relation, birth_year, region, hometown, occupation, instagram, relationship_status, match_interest, smoking, drinking, marriage_view, tattoo",
    )
    .eq("id", session.friendId)
    .single();

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
        <OnboardingProfileForm
          action={updateMeProfileAction}
          defaultValues={friend ?? undefined}
          variant="edit"
        />
      </div>
    </UserShell>
  );
}
