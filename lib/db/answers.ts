import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { QuestionType } from "@/lib/types/domain";

/**
 * V2 survey_answers — 가입자 본인 답변 upsert.
 *
 * PRD §4.6 — 키가 `(invitation_id, question_id)` → `(friend_id, question_id)` 로 변경.
 * 가입자가 본인 답변을 다시 수정 가능 (V1 의 1회용 토큰 제약 폐기).
 *
 * service-role 클라이언트 + 앱 레이어 인가. 호출 측에서 반드시 본인 row 검증
 * (`assertOwnFriendRow` / `requireOperator`) 선행.
 */

/**
 * SITE_OWNER 의 설문에 속한 question 한 건을 가져온다 (D7 의 1-hop join 축약).
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D7
 *
 * 기존 3-hop (survey_questions → survey_chapters → surveys.owner_id) 검증을
 * PostgREST inner-embed 한 쿼리로 축약. embed 의 `!inner` 가 owner_id 미일치
 * survey 를 prune → 다른 owner 의 question 은 결과 0행 → null 반환.
 *
 * value 검증 메타 (type / options) 도 함께 fetch 해 saveMeAnswerAction 이 D1
 * validation 을 즉시 수행할 수 있게 한다.
 *
 * 호출 측 책임:
 *   - SITE_OWNER 가입자 세션 검증 (`getCurrentUser` / `requireApprovedUser`)
 *   - 운영자 우회 차단 (`ensureNotOperator`)
 *   - 결과 null 처리 (question_not_found / question_owner_mismatch 둘 다 null)
 */
export async function fetchAnswerableQuestion(args: {
  questionId: string;
  ownerId: string;
}): Promise<{
  id: string;
  chapter_id: string;
  type: QuestionType;
  options: unknown;
} | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_questions")
    // 마지막 embed (`survey_chapters!inner ( surveys!inner ( owner_id ) )`) 는
    // join 가드 전용 — 반환 mapping 에는 쓰지 않는다. `!inner` 가 owner_id 미일치
    // 행을 prune 해 query 가 0행으로 떨어지는 게 목적.
    .select(
      "id, chapter_id, type, options, survey_chapters!inner ( surveys!inner ( owner_id ) )",
    )
    .eq("id", args.questionId)
    .eq("survey_chapters.surveys.owner_id", args.ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    chapter_id: data.chapter_id as string,
    type: data.type as QuestionType,
    options: data.options,
  };
}

export async function upsertSurveyAnswer(args: {
  friendId: string;
  questionId: string;
  value: unknown;
}): Promise<{ id: string; updated_at: string }> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_answers")
    .upsert(
      {
        friend_id: args.friendId,
        question_id: args.questionId,
        value: args.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "friend_id,question_id" },
    )
    .select("id, updated_at")
    .single();
  if (error) throw error;
  return {
    id: (data as { id: string }).id,
    updated_at: (data as { updated_at: string }).updated_at,
  };
}

/**
 * 한 가입자의 한 설문 (chapters/questions) 응답 전체를 가져온다.
 * 운영자 비교 뷰 / `/me/survey` 이어풀기 둘 다에서 사용.
 */
export async function listAnswersForFriend(
  friendId: string,
  questionIds?: string[],
): Promise<Array<{ id: string; question_id: string; value: unknown; updated_at: string }>> {
  const sb = createSupabaseServiceClient();
  let query = sb
    .from("survey_answers")
    .select("id, question_id, value, updated_at")
    .eq("friend_id", friendId);
  if (questionIds && questionIds.length > 0) {
    query = query.in("question_id", questionIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    question_id: string;
    value: unknown;
    updated_at: string;
  }>;
}
