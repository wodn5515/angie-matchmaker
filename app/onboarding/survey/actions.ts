"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { ensureNotOperator } from "@/lib/auth/user";

/**
 * V2 온보딩 Step 3 (`/onboarding/survey`) — 연애 성향 테스트 skip / 완료 처리.
 *
 * 답변 자체의 저장은 챕터 runner 의 server action (`/me/survey` 와 공유) 이 담당한다.
 * 여기서는 onboarding_step=null (= done) 으로 마무리만.
 *
 * 013 §D1·D2 — `/pending` 라우트 폐기 + `/me` 흡수. 마무리 직후 `/me` 로 안내.
 * pending+step=null 가입자는 `/me` 에 진입 가능하며 상단 배너로 심사 대기 상태를
 * 안내한다 (013 §D3 정직 카피).
 */
export async function finishOnboardingSurveyAction(): Promise<void> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/login");
  await ensureNotOperator();

  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select("id, status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!friend) redirect("/onboarding/profile");

  if (friend.status === "pending" && friend.onboarding_step !== null) {
    await service
      .from("friends")
      .update({ onboarding_step: null })
      .eq("id", friend.id);
  }

  redirect("/me");
}

/** skip 도 동일 동작 — onboarding_step=null + /me 안내. */
export const skipOnboardingSurveyAction = finishOnboardingSurveyAction;
