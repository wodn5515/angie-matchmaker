"use server";

import { revalidatePath } from "next/cache";
import { ensureNotOperator, getCurrentUser } from "@/lib/auth/user";
import { upsertSurveyAnswer } from "@/lib/db/answers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SITE_OWNER_ID } from "@/lib/auth/operator";

/**
 * `/me/survey` chapter runner 가 호출하는 단발 답변 저장.
 *
 * 가입자 본인 friend_id 로 (friend_id, question_id) upsert.
 * 운영자 우회 차단 + 본인 세션 검증 + rejected 차단 + question 소속 검증.
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
  // rejected 가입자는 페이지 진입은 막혀있지만 직접 server action POST 차단 (PRD §5.5).
  if (session.status === "rejected") return { ok: false, reason: "rejected" };

  // 문항 소속 검증 — SITE_OWNER_ID 의 설문에 속한 question 만 답변 허용.
  // 임의 / 폐기 question_id 로 survey_answers 가 오염되는 일을 막는다.
  const service = createSupabaseServiceClient();
  const { data: question, error: qErr } = await service
    .from("survey_questions")
    .select("id, chapter_id")
    .eq("id", input.questionId)
    .maybeSingle();
  if (qErr) return { ok: false, reason: "db_error" };
  if (!question) return { ok: false, reason: "question_not_found" };

  const { data: chapter } = await service
    .from("survey_chapters")
    .select("survey_id")
    .eq("id", question.chapter_id)
    .maybeSingle();
  if (!chapter) return { ok: false, reason: "chapter_not_found" };

  const { data: survey } = await service
    .from("surveys")
    .select("owner_id")
    .eq("id", chapter.survey_id)
    .maybeSingle();
  if (!survey || survey.owner_id !== SITE_OWNER_ID) {
    return { ok: false, reason: "question_owner_mismatch" };
  }

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
 * - rejected 가입자는 차단 (server action 직접 POST 우회 방지)
 */
export async function finishSurveyAction(): Promise<{
  ok: true;
  nextHref: string;
}> {
  await ensureNotOperator();
  const session = await getCurrentUser();
  if (!session) return { ok: true, nextHref: "/signup" };
  if (session.status === "rejected") return { ok: true, nextHref: "/rejected" };

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
