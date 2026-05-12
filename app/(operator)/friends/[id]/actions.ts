"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { updateFriend } from "@/lib/db/friends";

/**
 * 운영자 가입자 심사 — 승인 / 거절 / 재심사 되돌리기.
 *
 * 인라인 빠른 액션은 의도적으로 막고 상세 페이지에서만 호출 (PRD §3.2).
 */
export async function approveFriendAction(friendId: string): Promise<void> {
  const session = await requireOperator();
  await updateFriend(session.userId, friendId, {
    status: "approved",
    rejected_reason: null,
  });
  revalidatePath(`/friends/${friendId}`);
  revalidatePath("/friends");
  revalidatePath("/");
}

export async function rejectFriendAction(
  friendId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireOperator();
  const reason = String(formData.get("rejected_reason") ?? "").trim();
  await updateFriend(session.userId, friendId, {
    status: "rejected",
    rejected_reason: reason || null,
  });
  revalidatePath(`/friends/${friendId}`);
  revalidatePath("/friends");
  revalidatePath("/");
}

export async function resetFriendStatusAction(
  friendId: string,
): Promise<void> {
  const session = await requireOperator();
  await updateFriend(session.userId, friendId, {
    status: "pending",
    rejected_reason: null,
  });
  revalidatePath(`/friends/${friendId}`);
  revalidatePath("/friends");
  redirect(`/friends/${friendId}`);
}
