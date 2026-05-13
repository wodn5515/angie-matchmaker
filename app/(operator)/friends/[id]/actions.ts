"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { updateFriend } from "@/lib/db/friends";
import { RejectReasonSchema } from "@/lib/validation/reject-reason";

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
  // D3 — `notes` 와 동일 규약 (zod max(2000)). 비어있거나 trim 후 0자면 null 저장.
  const raw = formData.get("rejected_reason");
  // FormData.get 은 string | File | null — non-string 은 운영자 입력에 등장 불가지만
  // 안전하게 undefined 로 normalize 한 뒤 schema 에 위임.
  const parsed = RejectReasonSchema.safeParse(
    typeof raw === "string" ? raw : undefined,
  );
  if (!parsed.success) {
    throw new Error("거절 사유는 2000자 이하의 문자열이어야 합니다");
  }
  const trimmed = parsed.data ?? "";
  await updateFriend(session.userId, friendId, {
    status: "rejected",
    rejected_reason: trimmed.length > 0 ? trimmed : null,
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
