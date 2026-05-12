/**
 * survey_answers upsert 통합 테스트 — V2 새 키 (friend_id, question_id).
 *
 * PRD §4.6: 키가 (invitation_id, question_id) → (friend_id, question_id) 로 변경.
 * 가입자가 본인 답변을 수정 가능 (V1 의 1회용 제약 폐기).
 *
 * 구현 가정 (worker 가 채울 모듈):
 *
 *   import { upsertSurveyAnswer } from "@/lib/db/answers";
 *
 *   export async function upsertSurveyAnswer(args: {
 *     friendId: string;
 *     questionId: string;
 *     value: unknown;       // jsonb (mcq_single 의 단일 string / mcq_multi 의 배열 / likert 의 number / text 의 string)
 *   }): Promise<{ id: string; updated_at: string }>;
 *
 *   /\** 가입자가 본인 답변을 다시 호출하면 같은 row 가 update 된다. *\/
 *
 * Supabase 클라이언트는 mock — 실제 DB 없이 호출 패턴만 검증.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from "@/lib/supabase/server";
// @ts-expect-error worker 미작성
import { upsertSurveyAnswer } from "@/lib/db/answers";

describe("upsertSurveyAnswer — (friend_id, question_id) upsert", () => {
  let upsertSpy: ReturnType<typeof vi.fn>;
  let selectSpy: ReturnType<typeof vi.fn>;
  let singleSpy: ReturnType<typeof vi.fn>;
  let fromSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    singleSpy = vi.fn().mockResolvedValue({
      data: { id: "answer-1", updated_at: "2026-05-12T00:00:00Z" },
      error: null,
    });
    selectSpy = vi.fn(() => ({ single: singleSpy }));
    upsertSpy = vi.fn(() => ({ select: selectSpy }));
    fromSpy = vi.fn(() => ({ upsert: upsertSpy }));

    (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: fromSpy,
    });
  });

  it("survey_answers 테이블에 upsert 한다", async () => {
    await upsertSurveyAnswer({
      friendId: "friend-1",
      questionId: "q-1",
      value: "answer",
    });
    expect(fromSpy).toHaveBeenCalledWith("survey_answers");
  });

  it("conflict target 이 (friend_id, question_id) 이다", async () => {
    await upsertSurveyAnswer({
      friendId: "friend-1",
      questionId: "q-1",
      value: { selected: ["a", "b"] },
    });

    // upsert(..., { onConflict: "friend_id,question_id" }) 패턴 검증
    const args = upsertSpy.mock.calls[0];
    expect(args).toBeDefined();
    const options = args[1];
    expect(options).toMatchObject({
      onConflict: expect.stringMatching(/friend_id.*question_id/),
    });
  });

  it("invitation_id 는 더 이상 전달하지 않는다 (V1 키 폐기)", async () => {
    await upsertSurveyAnswer({
      friendId: "friend-1",
      questionId: "q-1",
      value: "answer",
    });

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload).not.toHaveProperty("invitation_id");
    expect(payload).toMatchObject({
      friend_id: "friend-1",
      question_id: "q-1",
    });
  });

  it("같은 (friend_id, question_id) 로 재호출 시 update 동작 (mock 단언)", async () => {
    await upsertSurveyAnswer({
      friendId: "friend-1",
      questionId: "q-1",
      value: "first",
    });
    await upsertSurveyAnswer({
      friendId: "friend-1",
      questionId: "q-1",
      value: "second",
    });
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy.mock.calls[1][0]).toMatchObject({
      value: "second",
    });
  });
});
