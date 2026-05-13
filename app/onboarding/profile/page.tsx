import { redirect } from "next/navigation";
import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { OnboardingProfileForm } from "./profile-form";
import { submitOnboardingProfileAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 1 (필수).
 * PRD §3.1.2 — 이름·성별·성취향·추천인(필수) + 7개 권장 필드(선택).
 *
 * proxy 가드(`/lib/auth/guard.ts`) 가 신규 가입자만 이 페이지에 진입시킨다.
 * 폼은 본인 friends row 가 있을 경우 prefill 한다 (재방문 시 이어풀기 UX).
 */
export default async function OnboardingProfilePage() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/login");

  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select(
      "name, gender, preferred_gender, recommender_name, recommender_relation, birth_year, region, hometown, occupation, instagram, relationship_status, match_interest",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={0}
          emoji="🌸"
          title="내 프로필을 알려주세요"
          subtitle="필수 5가지만 채워도 다음 단계로 갈 수 있어요"
        />
        <OnboardingProfileForm
          action={submitOnboardingProfileAction}
          defaultValues={friend ?? undefined}
          variant="onboarding"
        />
      </div>
    </UserShell>
  );
}
