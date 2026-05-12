"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { ensureNotOperator } from "@/lib/auth/user";
import { upsertFriendIdealAggregate } from "@/lib/db/ideals";
import { parsePreferencesFormData } from "@/lib/validation/profile";

/**
 * V2 온보딩 Step 2 (`/onboarding/preferences`) — 이상형 저장.
 *
 * PRD §3.3.3 — 3단 구조 (선호 8개 + 성격 키워드/자유 텍스트 + 우선순위 top 3).
 * friend_ideals 1:1 + 1:N 5개 테이블 한 번에 upsert + onboarding_step=3.
 */
export async function submitOnboardingPreferencesAction(
  formData: FormData,
): Promise<void> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/signup");
  await ensureNotOperator();

  const service = createSupabaseServiceClient();
  const { data: friend, error: friendErr } = await service
    .from("friends")
    .select("id, status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (friendErr) throw friendErr;
  if (!friend) redirect("/onboarding/profile");

  const input = parsePreferencesFormData(formData);
  await upsertFriendIdealAggregate({ friendId: friend.id, ...input });

  // 온보딩 진행 단계 갱신 (이미 3 이상이면 그대로)
  if (
    friend.status === "pending" &&
    friend.onboarding_step !== null &&
    friend.onboarding_step < 3
  ) {
    const upd = await service
      .from("friends")
      .update({ onboarding_step: 3 })
      .eq("id", friend.id);
    if (upd.error) throw upd.error;
  }

  redirect("/onboarding/survey");
}

/**
 * Step 2 skip — 이상형 미작성 채로 다음 단계.
 */
export async function skipOnboardingPreferencesAction(): Promise<void> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/signup");
  await ensureNotOperator();

  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select("id, status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!friend) redirect("/onboarding/profile");

  if (
    friend.status === "pending" &&
    friend.onboarding_step !== null &&
    friend.onboarding_step < 3
  ) {
    await service
      .from("friends")
      .update({ onboarding_step: 3 })
      .eq("id", friend.id);
  }

  redirect("/onboarding/survey");
}
