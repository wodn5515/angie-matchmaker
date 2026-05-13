import { redirect } from "next/navigation";
import { UserShell } from "@/components/user/user-shell";
import { OnboardingStepHeader } from "@/components/user/onboarding-step-header";
import { Button } from "@/components/ui/button";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getFriendIdealAggregate } from "@/lib/db/ideals";
import { PreferencesForm } from "./preferences-form";
import {
  submitOnboardingPreferencesAction,
  skipOnboardingPreferencesAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * V2 온보딩 Step 2 (선택 — skip 가능).
 * PRD §3.3.3 — "이런 분이면 좋겠어요" 3단 구조.
 *
 * proxy 가드가 onboarding 진행 중 가입자만 진입시킨다. 이미 작성한 이상형은 prefill.
 */
export default async function OnboardingPreferencesPage() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/login");

  // friends row 조회 (자기 row)
  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!friend) redirect("/onboarding/profile");

  // 이미 저장한 이상형 (prefill)
  const ideals = await getFriendIdealAggregate(friend.id);
  const defaults = {
    age_from: ideals.ideals?.age_from ?? undefined,
    age_to: ideals.ideals?.age_to ?? undefined,
    hometown_same_bonus: ideals.ideals?.hometown_same_bonus ?? false,
    smoking: ideals.ideals?.smoking ?? "any",
    drinking: ideals.ideals?.drinking ?? "any",
    marriage_timing: ideals.ideals?.marriage_timing ?? "any",
    tattoo: ideals.ideals?.tattoo ?? "any",
    free_text: ideals.ideals?.free_text ?? "",
    // 012 — DB 객체 키 (region_detail/hometown_detail) → 폼 키 (detail) 매핑.
    regions: ideals.regions.map((r) => ({
      region: r.region,
      detail: r.region_detail,
    })),
    hometowns: ideals.hometowns.map((h) => ({
      region: h.hometown,
      detail: h.hometown_detail,
    })),
    jobs: ideals.jobs,
    personality_keywords: ideals.personality_keywords,
    priorities: ideals.priorities,
  };

  return (
    <UserShell>
      <div className="space-y-8">
        <OnboardingStepHeader
          currentIndex={1}
          emoji="💞"
          title="이런 분이면 좋겠어요"
          subtitle="안 채워도 괜찮아요. 채울수록 매칭 정확도가 올라가요."
        />

        <PreferencesForm
          action={submitOnboardingPreferencesAction}
          defaultValues={defaults}
          variant="onboarding"
        />

        <form action={skipOnboardingPreferencesAction}>
          <Button type="submit" variant="ghost" className="w-full">
            지금은 건너뛸게요 →
          </Button>
        </form>
      </div>
    </UserShell>
  );
}
