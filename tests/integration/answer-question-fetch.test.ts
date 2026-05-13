/**
 * D7 — `fetchAnswerableQuestion` 통합 테스트 (사용자 리뷰 🟡 #1 후속).
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D7
 *
 * `saveMeAnswerAction` 의 3-hop owner 검증을 PostgREST inner-embed 한 join 으로
 * 축약한 헬퍼. 라운드-4 응대 커밋 `dccd380` 에서 `lib/db/answers.ts` 로 추출됨.
 *
 * 사용자 리뷰 🟡 #1 의 검증 의도:
 * > "기존 단위 spec 은 `validateAnswerValue` 만 검증하고 액션 내부 supabase 쿼리는
 *    mock 처리 → embed + nested filter 실 동작 미검증."
 *
 * 이 spec 은 mock supabase-js client 로 헬퍼의 쿼리 형태 (select 문자열 / nested
 * filter / maybeSingle / 반환 mapping) 를 회귀 방어한다.
 *
 * 헬퍼 시그니처 (구현 확정):
 *
 *   export async function fetchAnswerableQuestion(args: {
 *     questionId: string;
 *     ownerId: string;
 *   }): Promise<{
 *     id: string;
 *     chapter_id: string;
 *     type: QuestionType;
 *     options: unknown;
 *   } | null>;
 *
 * 검증 포인트:
 *   1. 유효 질문 → Question 객체 반환 (chapter_id / type / options 포함)
 *   2. 다른 owner 의 chapter 의 question_id → null (inner-embed 가 row prune)
 *   3. 존재하지 않는 question_id → null
 *   4. select 문자열에 `survey_chapters!inner ( surveys!inner ( owner_id ) )` embed 포함
 *   5. nested filter `.eq("survey_chapters.surveys.owner_id", ownerId)` 정확한 path
 *   6. `.maybeSingle()` 호출 (not-found 가 throw 가 아닌 null)
 *   7. supabase 에러는 throw (호출 측이 catch → `db_error` 처리)
 *   8. embed 컬럼은 반환 mapping 에 새지 않는다 (호출 측에 join 가드 노출 차단)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchAnswerableQuestion } from "@/lib/db/answers";

type ChainSpies = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eqCalls: Array<[string, unknown]>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

/**
 * supabase-js builder chain 모사:
 *   sb.from(table)
 *     .select(cols)
 *     .eq(col, val)        ← 여러 번 chain
 *     .maybeSingle()
 *
 * 모든 step 은 builder 자신을 다시 리턴 (chainable). `maybeSingle()` 에서만
 * Promise<{ data, error }> 로 resolve.
 */
function mockSupabaseChain(result: {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
}): ChainSpies {
  const eqCalls: Array<[string, unknown]> = [];
  const builder: Record<string, unknown> = {};
  const select = vi.fn(() => builder);
  const eq = vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return builder;
  });
  const maybeSingle = vi.fn().mockResolvedValue(result);
  builder.select = select;
  builder.eq = eq;
  builder.maybeSingle = maybeSingle;

  const from = vi.fn(() => builder);
  (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from,
  });
  return { from, select, eqCalls, maybeSingle };
}

const OWNER_ID = "owner-aaa-111";
const QUESTION_ID = "q-001";

describe("fetchAnswerableQuestion — D7 inner-embed owner 검증 (사용자 🟡 #1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SITE_OWNER 의 question_id 는 Question 객체로 반환된다", async () => {
    mockSupabaseChain({
      data: {
        id: QUESTION_ID,
        chapter_id: "chapter-1",
        type: "mcq_single",
        options: ["a", "b", "c"],
        // embed 컬럼 — 헬퍼는 join 가드용으로만 쓰고 반환에는 포함하지 않아야 함.
        survey_chapters: { surveys: { owner_id: OWNER_ID } },
      },
      error: null,
    });

    const result = await fetchAnswerableQuestion({
      questionId: QUESTION_ID,
      ownerId: OWNER_ID,
    });

    expect(result).toEqual({
      id: QUESTION_ID,
      chapter_id: "chapter-1",
      type: "mcq_single",
      options: ["a", "b", "c"],
    });
  });

  it("다른 owner 의 question_id → null (inner-embed 가 row 를 prune)", async () => {
    // PostgREST 의 `!inner` 가 owner_id 미일치 행을 제거 → 결과 0행 → data null.
    mockSupabaseChain({ data: null, error: null });

    const result = await fetchAnswerableQuestion({
      questionId: QUESTION_ID,
      ownerId: OWNER_ID,
    });

    expect(result).toBeNull();
  });

  it("존재하지 않는 question_id → null", async () => {
    mockSupabaseChain({ data: null, error: null });

    const result = await fetchAnswerableQuestion({
      questionId: "non-existent",
      ownerId: OWNER_ID,
    });

    expect(result).toBeNull();
  });

  it("`survey_questions` 테이블에서 조회한다", async () => {
    const spies = mockSupabaseChain({ data: null, error: null });
    await fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID });
    expect(spies.from).toHaveBeenCalledWith("survey_questions");
  });

  it("select 문자열에 `survey_chapters!inner ( surveys!inner ( owner_id ) )` embed 포함", async () => {
    const spies = mockSupabaseChain({ data: null, error: null });
    await fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID });

    expect(spies.select).toHaveBeenCalledTimes(1);
    const selectArg = spies.select.mock.calls[0][0] as string;
    // 핵심 컬럼
    expect(selectArg).toContain("id");
    expect(selectArg).toContain("chapter_id");
    expect(selectArg).toContain("type");
    expect(selectArg).toContain("options");
    // inner-embed (양쪽 모두 `!inner` 로 owner_id 미일치 prune)
    expect(selectArg).toMatch(/survey_chapters\s*!\s*inner/);
    expect(selectArg).toMatch(/surveys\s*!\s*inner/);
    expect(selectArg).toContain("owner_id");
  });

  it("nested filter `.eq('survey_chapters.surveys.owner_id', ownerId)` 정확한 path", async () => {
    const spies = mockSupabaseChain({ data: null, error: null });
    await fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID });

    // .eq("id", questionId) + .eq("survey_chapters.surveys.owner_id", ownerId) 두 번.
    const ownerEq = spies.eqCalls.find(
      ([col]) => col === "survey_chapters.surveys.owner_id",
    );
    expect(ownerEq).toBeDefined();
    expect(ownerEq?.[1]).toBe(OWNER_ID);
  });

  it("`.eq('id', questionId)` 로 question_id 필터한다", async () => {
    const spies = mockSupabaseChain({ data: null, error: null });
    await fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID });

    const idEq = spies.eqCalls.find(([col]) => col === "id");
    expect(idEq).toBeDefined();
    expect(idEq?.[1]).toBe(QUESTION_ID);
  });

  it("`.maybeSingle()` 로 종결 — not-found 가 throw 가 아닌 null", async () => {
    const spies = mockSupabaseChain({ data: null, error: null });
    await fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID });
    expect(spies.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("supabase error 는 throw — 호출 측 catch 로 `db_error` 처리", async () => {
    mockSupabaseChain({ data: null, error: { message: "connection refused" } });

    await expect(
      fetchAnswerableQuestion({ questionId: QUESTION_ID, ownerId: OWNER_ID }),
    ).rejects.toBeTruthy();
  });

  it("embed 컬럼 (`survey_chapters`) 은 반환 객체에 새지 않는다", async () => {
    // 호출 측에 join 가드용 nested 객체가 노출되면 안 됨 — id/chapter_id/type/options 4개만.
    mockSupabaseChain({
      data: {
        id: QUESTION_ID,
        chapter_id: "chapter-1",
        type: "likert",
        options: { min: 1, max: 5 },
        survey_chapters: { surveys: { owner_id: OWNER_ID } },
      },
      error: null,
    });

    const result = await fetchAnswerableQuestion({
      questionId: QUESTION_ID,
      ownerId: OWNER_ID,
    });

    expect(result).not.toBeNull();
    expect(Object.keys(result!).sort()).toEqual(
      ["chapter_id", "id", "options", "type"].sort(),
    );
    expect(result).not.toHaveProperty("survey_chapters");
  });
});
