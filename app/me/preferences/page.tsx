import Link from "next/link";
import { UserShell } from "@/components/user/user-shell";
import { PreferencesForm } from "@/app/onboarding/preferences/preferences-form";
import { requireOnboardedUser } from "@/lib/auth/user";
import { getFriendIdealAggregate } from "@/lib/db/ideals";
import { updateMePreferencesAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * V2 `/me/preferences` — 승인된 가입자가 본인 이상형 수정.
 * 폼은 온보딩 Step 2 의 `PreferencesForm` 을 variant="edit" 으로 재사용.
 */
export default async function MePreferencesPage() {
  const session = await requireOnboardedUser();
  const ideals = await getFriendIdealAggregate(session.friendId);
  const defaults = {
    age_from: ideals.ideals?.age_from ?? undefined,
    age_to: ideals.ideals?.age_to ?? undefined,
    hometown_same_bonus: ideals.ideals?.hometown_same_bonus ?? false,
    smoking: ideals.ideals?.smoking ?? "any",
    drinking: ideals.ideals?.drinking ?? "any",
    marriage_timing: ideals.ideals?.marriage_timing ?? "any",
    tattoo: ideals.ideals?.tattoo ?? "any",
    free_text: ideals.ideals?.free_text ?? "",
    regions: ideals.regions,
    hometowns: ideals.hometowns,
    jobs: ideals.jobs,
    personality_keywords: ideals.personality_keywords,
    priorities: ideals.priorities,
  };

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
        <PreferencesForm
          action={updateMePreferencesAction}
          defaultValues={defaults}
          variant="edit"
        />
      </div>
    </UserShell>
  );
}
