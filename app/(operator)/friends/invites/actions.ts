"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import {
  createFriendInvitation,
  deleteFriendInvitation,
} from "@/lib/db/friend-invitations";

const CreateSchema = z.object({
  hintName: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  hintNote: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function createFriendInvitationAction(
  input: z.infer<typeof CreateSchema>,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const session = await requireOperator();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  try {
    const inv = await createFriendInvitation(
      session.userId,
      parsed.data.hintName,
      parsed.data.hintNote,
    );
    revalidatePath("/friends/invites");
    revalidatePath("/friends");
    return { ok: true, token: inv.token };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "링크 생성 실패",
    };
  }
}

const DeleteSchema = z.object({
  invitationId: z.string().uuid(),
});

export async function deleteFriendInvitationAction(
  input: z.infer<typeof DeleteSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOperator();
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청입니다" };
  try {
    await deleteFriendInvitation(session.userId, parsed.data.invitationId);
    revalidatePath("/friends/invites");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "삭제 실패",
    };
  }
}
