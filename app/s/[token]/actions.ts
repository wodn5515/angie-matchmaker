"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getInvitationByToken,
  setInvitationStatus,
  upsertAnswer,
} from "@/lib/db/invitations";

const AnswerSchema = z.object({
  token: z.string(),
  questionId: z.string().uuid(),
  value: z.unknown(),
});

export async function saveAnswerAction(
  input: z.infer<typeof AnswerSchema>,
): Promise<{ ok: boolean; reason?: string }> {
  const parsed = AnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };
  const bundle = await getInvitationByToken(parsed.data.token);
  if (!bundle) return { ok: false, reason: "not_found" };
  if (bundle.invitation.status === "completed") {
    return { ok: false, reason: "completed" };
  }
  // Authorize: question must belong to this invitation's survey.
  const question = bundle.questions.find(
    (q) => q.id === parsed.data.questionId,
  );
  if (!question) return { ok: false, reason: "question_not_in_survey" };

  await upsertAnswer(
    bundle.invitation.id,
    parsed.data.questionId,
    parsed.data.value,
  );
  if (bundle.invitation.status === "pending") {
    await setInvitationStatus(bundle.invitation.id, "in_progress");
  }
  return { ok: true };
}

export async function submitSurveyAction(
  token: string,
): Promise<{ ok: boolean; reason?: string }> {
  const bundle = await getInvitationByToken(token);
  if (!bundle) return { ok: false, reason: "not_found" };
  if (bundle.invitation.status === "completed")
    return { ok: false, reason: "completed" };

  // Required questions check
  const ansByQ = new Map(bundle.answers.map((a) => [a.question_id, a.value]));
  for (const q of bundle.questions) {
    if (!q.required) continue;
    const v = ansByQ.get(q.id);
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
      return { ok: false, reason: "missing_required" };
    }
  }
  await setInvitationStatus(bundle.invitation.id, "completed");
  revalidatePath(`/`);
  return { ok: true };
}
