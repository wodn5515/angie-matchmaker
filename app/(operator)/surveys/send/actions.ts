"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import { createInvitation } from "@/lib/db/invitations";

const Schema = z.object({
  friendId: z.string().uuid(),
  surveyId: z.string().uuid(),
});

export async function createInvitationAction(
  input: z.infer<typeof Schema>,
): Promise<{ token: string }> {
  const session = await requireOperator();
  const parsed = Schema.parse(input);
  const inv = await createInvitation(
    session.userId,
    parsed.friendId,
    parsed.surveyId,
  );
  revalidatePath("/");
  revalidatePath(`/friends/${parsed.friendId}`);
  return { token: inv.token };
}
