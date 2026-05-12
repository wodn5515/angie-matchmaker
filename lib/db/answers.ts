import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * V2 survey_answers — 가입자 본인 답변 upsert.
 *
 * PRD §4.6 — 키가 `(invitation_id, question_id)` → `(friend_id, question_id)` 로 변경.
 * 가입자가 본인 답변을 다시 수정 가능 (V1 의 1회용 토큰 제약 폐기).
 *
 * service-role 클라이언트 + 앱 레이어 인가. 호출 측에서 반드시 본인 row 검증
 * (`assertOwnFriendRow` / `requireOperator`) 선행.
 */
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
