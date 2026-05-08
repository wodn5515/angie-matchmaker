"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import { getOrCreatePair, updatePair } from "@/lib/db/pairs";
import type { PairOutcome } from "@/lib/types/domain";

const PairUpsert = z.object({
  friendAId: z.string().uuid(),
  friendBId: z.string().uuid(),
  comparisonMemo: z.string().max(4000).optional(),
  introduced: z.boolean().optional(),
  outcome: z.enum(["good", "bad", "in_progress", "unknown"]).optional(),
  outcomeMemo: z.string().max(4000).optional(),
});

export async function upsertPairAction(
  input: z.infer<typeof PairUpsert>,
): Promise<{ ok: true }> {
  const session = await requireOperator();
  const parsed = PairUpsert.parse(input);
  const pair = await getOrCreatePair(
    session.userId,
    parsed.friendAId,
    parsed.friendBId,
  );
  const patch: Parameters<typeof updatePair>[2] = {};
  if (parsed.comparisonMemo !== undefined) {
    patch.comparison_memo = parsed.comparisonMemo;
  }
  if (parsed.introduced !== undefined) {
    patch.introduced = parsed.introduced;
    patch.introduced_at = parsed.introduced ? new Date().toISOString() : null;
  }
  if (parsed.outcome !== undefined) {
    patch.outcome = parsed.outcome as PairOutcome;
  }
  if (parsed.outcomeMemo !== undefined) {
    patch.outcome_memo = parsed.outcomeMemo;
  }
  if (Object.keys(patch).length > 0) {
    await updatePair(session.userId, pair.id, patch);
  }
  revalidatePath("/matches");
  revalidatePath("/");
  return { ok: true };
}
