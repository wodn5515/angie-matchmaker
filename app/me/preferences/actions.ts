"use server";

import { redirect } from "next/navigation";
import { requireOnboardedUser, ensureNotOperator } from "@/lib/auth/user";
import { upsertFriendIdealAggregate } from "@/lib/db/ideals";
import { parsePreferencesFormData } from "@/lib/validation/profile";

/**
 * `/me/preferences` — 승인된 가입자가 본인 이상형 수정.
 */
export async function updateMePreferencesAction(
  formData: FormData,
): Promise<void> {
  await ensureNotOperator();
  const session = await requireOnboardedUser();
  const input = parsePreferencesFormData(formData);
  await upsertFriendIdealAggregate({ friendId: session.friendId, ...input });
  redirect("/me");
}
