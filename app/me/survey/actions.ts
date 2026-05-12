"use server";

import { revalidatePath } from "next/cache";
import { ensureNotOperator, getCurrentUser } from "@/lib/auth/user";
import { upsertSurveyAnswer } from "@/lib/db/answers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * `/me/survey` chapter runner 가 호출하는 단발 답변 저장.
 *
 * 가입자 본인 friend_id 로 (friend_id, question_id) upsert.
 * 운영자 우회 차단 + 본인 세션 검증.
 *
 * 가입자 status 가 pending(온보딩 중) 이어도 답변 저장은 허용 — 온보딩 Step 3 에서
 * 챕터 runner 를 재사용하기 때문. approved 가입자는 본인 답변 수정에 그대로 사용.
 */
export async function saveMeAnswerAction(input: {
  questionId: string;
  value: unknown;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  await ensureNotOperator();
  const session = await getCurrentUser();
  if (!session) return { ok: false, reason: "not_authenticated" };

  // 문항 존재 확인 (소속 survey 멤버십은 운영자 책임)
  const service = createSupabaseServiceClient();
  const { data: question, error: qErr } = await service
    .from("survey_questions")
    .select("id")
    .eq("id", input.questionId)
    .maybeSingle();
  if (qErr) return { ok: false, reason: "db_error" };
  if (!question) return { ok: false, reason: "question_not_found" };

  await upsertSurveyAnswer({
    friendId: session.friendId,
    questionId: input.questionId,
    value: input.value,
  });
  revalidatePath("/me/survey");
  revalidatePath("/me");
  return { ok: true };
}

/**
 * 챕터 runner 가 마지막 챕터 완료 시 호출.
 *
 * - 온보딩 중(pending + onboarding_step != null) → onboarding_step=null 처리 후
 *   `/pending` 으로 안내
 * - 승인된 가입자 → 단순히 `/me` 로 navigate
 */
export async function finishSurveyAction(): Promise<{
  ok: true;
  nextHref: string;
}> {
  await ensureNotOperator();
  const session = await getCurrentUser();
  if (!session) return { ok: true, nextHref: "/signup" };

  if (session.status === "pending" && session.onboardingStep !== null) {
    const service = createSupabaseServiceClient();
    await service
      .from("friends")
      .update({ onboarding_step: null })
      .eq("id", session.friendId);
    return { ok: true, nextHref: "/pending" };
  }
  if (session.status === "approved") {
    return { ok: true, nextHref: "/me" };
  }
  return { ok: true, nextHref: "/" };
}
