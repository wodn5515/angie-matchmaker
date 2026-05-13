"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireOnboardedUser, ensureNotOperator } from "@/lib/auth/user";
import { ProfileObjectSchema } from "@/lib/validation/profile";

/**
 * `/me/profile` — 승인된 가입자가 본인 프로필 수정.
 *
 * 본인은 추천인 (recommender_name, recommender_relation) 을 변경할 수 없다 —
 * 가입 시 1회 입력 후 운영자만 수정 가능 (PRD §3.3.2 의도).
 *
 * 폼에서 두 필드가 `disabled` 라 FormData submit 에 포함되지 않으므로,
 * server schema 도 두 필드를 omit 한 변형을 사용해 validation 실패를 피하고,
 * 클라이언트가 hidden input 으로 임의 값을 보내도 server 가 무시한다.
 */
const MeProfileSchema = ProfileObjectSchema.omit({
  recommender_name: true,
  recommender_relation: true,
}).transform((data) => ({
  ...data,
  // 012 §D1 CHECK 정합 — region 없이 detail 만 있는 경우 detail null 로 normalize.
  region_detail: data.region ? data.region_detail : null,
  hometown_detail: data.hometown ? data.hometown_detail : null,
}));

export async function updateMeProfileAction(formData: FormData): Promise<void> {
  await ensureNotOperator();
  const session = await requireOnboardedUser();
  const parsed = MeProfileSchema.parse(Object.fromEntries(formData.entries()));

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("friends")
    .update(parsed)
    .eq("id", session.friendId);
  if (error) throw error;

  redirect("/me");
}
