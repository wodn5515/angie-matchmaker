"use server";

import { revalidatePath } from "next/cache";
import { ensureNotOperator, getCurrentUser } from "@/lib/auth/user";
import { upsertSurveyAnswer } from "@/lib/db/answers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SITE_OWNER_ID } from "@/lib/auth/operator";
import { validateAnswerValue } from "@/lib/validation/answer-value";
import type { QuestionType } from "@/lib/types/domain";

/**
 * `/me/survey` chapter runner 가 호출하는 단발 답변 저장.
 *
 * 가입자 본인 friend_id 로 (friend_id, question_id) upsert.
 * 운영자 우회 차단 + 본인 세션 검증 + rejected 차단 + question 소속 검증
 * + question.type/options 기반 value 검증 (decisions/007 §D1).
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

  // 문항 소속 + 검증 메타 fetch (decisions/007 §D7).
  // 3-hop (survey_questions → survey_chapters → surveys.owner_id) 검증을 한 join 으로
  // 축약 — owner 당 표준 설문 1개 가정 (surveys.is_standard / is_active 정책) 하에 안전.
  // PostgREST 의 embed 문법 (`survey_chapters!inner ( surveys!inner ( owner_id ) )`) 으로
  // owner_id 가 SITE_OWNER_ID 가 아닌 question 은 결과 0행 → not_found 분기로 거절.
  const service = createSupabaseServiceClient();
  const { data: question, error: qErr } = await service
    .from("survey_questions")
    .select(
      "id, chapter_id, type, options, survey_chapters!inner ( surveys!inner ( owner_id ) )",
    )
    .eq("id", input.questionId)
    .eq("survey_chapters.surveys.owner_id", SITE_OWNER_ID)
    .maybeSingle();
  if (qErr) return { ok: false, reason: "db_error" };
  if (!question) return { ok: false, reason: "question_not_found" };

  // D1 — server side value validation
  const validation = validateAnswerValue(
    {
      type: question.type as QuestionType,
      options: question.options,
    },
    input.value,
  );
  if (!validation.ok) return { ok: false, reason: validation.reason };

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
