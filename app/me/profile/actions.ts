"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireApprovedUser, ensureNotOperator } from "@/lib/auth/user";
import { ProfileSchema } from "@/lib/validation/profile";

/**
 * `/me/profile` — 승인된 가입자가 본인 프로필 수정.
 *
 * status / onboarding_step 은 손대지 않는다. 프로필 필드만 update.
 */
export async function updateMeProfileAction(formData: FormData): Promise<void> {
  await ensureNotOperator();
  const session = await requireApprovedUser();
  const parsed = ProfileSchema.parse(Object.fromEntries(formData.entries()));

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("friends")
    .update(parsed)
    .eq("id", session.friendId);
  if (error) throw error;

  redirect("/me");
}
