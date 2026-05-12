"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireApprovedUser, ensureNotOperator } from "@/lib/auth/user";
import { ProfileSchema } from "@/lib/validation/profile";

/**
 * `/me/profile` — 승인된 가입자가 본인 프로필 수정.
 *
 * status / onboarding_step / 추천인 (recommender_name, recommender_relation) 은
 * 본인이 임의로 변경할 수 없는 영역 — 추천인은 가입 시 1회 입력 후 운영자만 수정.
 * `/me/profile` 액션에서는 ProfileSchema 결과에서 두 필드를 제외하고 update.
 */
export async function updateMeProfileAction(formData: FormData): Promise<void> {
  await ensureNotOperator();
  const session = await requireApprovedUser();
  const parsed = ProfileSchema.parse(Object.fromEntries(formData.entries()));

  // 추천인 두 필드는 본인이 변경 불가 — 운영자 측 (`/friends/[id]/edit`) 에서만 수정.
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recommender_name: _ignoredRecommenderName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recommender_relation: _ignoredRecommenderRelation,
    ...updatable
  } = parsed;

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("friends")
    .update(updatable)
    .eq("id", session.friendId);
  if (error) throw error;

  redirect("/me");
}
