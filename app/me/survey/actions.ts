"use server";

import { revalidatePath } from "next/cache";
import { ensureNotOperator, getCurrentUser } from "@/lib/auth/user";
import {
  fetchAnswerableQuestion,
  upsertSurveyAnswer,
} from "@/lib/db/answers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SITE_OWNER_ID } from "@/lib/auth/operator";
import { validateAnswerValue } from "@/lib/validation/answer-value";

/**
 * `/me/survey` chapter runner 가 호출하는 단발 답변 저장.
 *
 * 가입자 본인 friend_id 로 (friend_id, question_id) upsert.
 * 운영자 우회 차단 + 본인 세션 검증 + rejected 차단 + question 소속 검증
 * + question.type/options 기반 value 검증 (decisions/007 §D1).
 *
 * 가입자 status 가 pending(온보딩 중) 이어도 답변 저장은 허용 — 온보딩 Step 3 에서
 * 챕터 runner 를 재사용하기 때문. approved 가입자는 본인 답변 수정에 그대로 사용.
 *
 * D7 의 inner-embed 한 join 은 `fetchAnswerableQuestion` 헬퍼로 추출 — 라운드-4
 * 사용자 리뷰 🟡 #1 의 query helper 추출 (`lib/db/answers.ts`).
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

  // 문항 소속 + 검증 메타 fetch — `fetchAnswerableQuestion` 헬퍼가 D7 의
  // PostgREST inner-embed 1-hop join 을 캡슐화. SITE_OWNER_ID 미일치 question 은
  // 결과 null 로 자연 거절.
  let question: Awaited<ReturnType<typeof fetchAnswerableQuestion>>;
  try {
    question = await fetchAnswerableQuestion({
      questionId: input.questionId,
      ownerId: SITE_OWNER_ID,
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }
  if (!question) return { ok: false, reason: "question_not_found" };

  // D1 — server side value validation
  const validation = validateAnswerValue(
    {
      type: question.type,
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
 *   `/me` 로 안내 (013 §D1·D2 — `/pending` 라우트 폐기, `/me` 가 심사 대기 배너 노출)
 * - 승인된 가입자 → 단순히 `/me` 로 navigate
 * - rejected 가입자는 차단 (server action 직접 POST 우회 방지)
 */
export async function finishSurveyAction(): Promise<{
  ok: true;
  nextHref: string;
}> {
  await ensureNotOperator();
  const session = await getCurrentUser();
  if (!session) return { ok: true, nextHref: "/login" };
  if (session.status === "rejected") return { ok: true, nextHref: "/rejected" };

  if (session.status === "pending" && session.onboardingStep !== null) {
    const service = createSupabaseServiceClient();
    await service
      .from("friends")
      .update({ onboarding_step: null })
      .eq("id", session.friendId);
    return { ok: true, nextHref: "/me" };
  }
  if (session.status === "approved") {
    return { ok: true, nextHref: "/me" };
  }
  return { ok: true, nextHref: "/" };
}
