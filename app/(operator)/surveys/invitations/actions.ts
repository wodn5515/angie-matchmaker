"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import { deleteInvitation } from "@/lib/db/invitations";

const DeleteSchema = z.object({
  invitationId: z.string().uuid(),
});

export async function deleteInvitationAction(
  input: z.infer<typeof DeleteSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOperator();
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청입니다" };
  try {
    await deleteInvitation(session.userId, parsed.data.invitationId);
    revalidatePath("/invitations");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "삭제 실패",
    };
  }
}
