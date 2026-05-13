/**
 * D1 — `saveMeAnswerAction` server-side value validation 단위 테스트.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D1
 *
 * 가입자 측 server action 이 받는 `value: unknown` 을 question.type / question.options
 * 에 따라 server side 에서 검증해야 한다. 현재 구현은 검증 없이 그대로 upsert 하므로
 * 임의 페이로드가 survey_answers 에 오염될 수 있다.
 *
 * worker 가 채워야 할 인터페이스 (순수 함수 — 단위 테스트 가능하게 분리):
 *
 *   // 위치: app/me/survey/actions.ts 또는 lib/db/answers.ts (Lead 가 자율 채택)
 *   //   Lead 의 채택 가이드: `actions.ts` 내부에 export 하거나, `lib/validation/answer-value.ts`
 *   //   같은 모듈로 분리 — spec 은 path 만 변경 가능하면 통과.
 *   export type AnswerValidationResult =
 *     | { ok: true }
 *     | { ok: false; reason: string };
 *
 *   export function validateAnswerValue(
 *     question: { type: QuestionType; options: unknown },
 *     value: unknown,
 *   ): AnswerValidationResult;
 *
 * type → options 매핑 (lib/types/domain.ts 참고):
 *   - mcq_single → ChoiceOptions = string[]
 *   - mcq_multi  → ChoiceOptions = string[]
 *   - likert     → LikertOptions = { min: number; max: number; minLabel?: string; maxLabel?: string }
 *   - ranking    → RankingOptions = string[]
 *   - text       → { placeholder?: string } | undefined | null (옵션 없어도 됨)
 *
 * 통과 조건 ("ok: true") 외 거절 사유 문자열은 worker 자율. 단언은 ok flag 만 검증.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 가 아직 작성하지 않은 모듈 — 빨강 보장
import { validateAnswerValue } from "@/lib/validation/answer-value";

describe("validateAnswerValue — server-side question value 검증 (D1)", () => {
  describe("mcq_single", () => {
    const q = {
      type: "mcq_single" as const,
      options: ["a", "b", "c"],
    };

    it("옵션 안의 string 값은 통과", () => {
      const result = validateAnswerValue(q, "a");
      expect(result.ok).toBe(true);
    });

    it("옵션 밖의 string 값은 거절", () => {
      const result = validateAnswerValue(q, "z");
      expect(result.ok).toBe(false);
    });

    it("number 같은 non-string 은 거절", () => {
      const result = validateAnswerValue(q, 1);
      expect(result.ok).toBe(false);
    });

    it("배열은 거절 (mcq_single 인데 multi)", () => {
      const result = validateAnswerValue(q, ["a"]);
      expect(result.ok).toBe(false);
    });

    it("null 은 거절", () => {
      const result = validateAnswerValue(q, null);
      expect(result.ok).toBe(false);
    });
  });

  describe("mcq_multi", () => {
    const q = {
      type: "mcq_multi" as const,
      options: ["a", "b", "c"],
    };

    it("옵션 부분집합 배열은 통과", () => {
      const result = validateAnswerValue(q, ["a", "b"]);
      expect(result.ok).toBe(true);
    });

    it("빈 배열은 통과 (선택 사항)", () => {
      // 빈 배열은 의미상 '아무것도 선택 안 함' = ok. required 검증은 별 layer.
      const result = validateAnswerValue(q, []);
      expect(result.ok).toBe(true);
    });

    it("옵션 밖 값이 포함되면 거절", () => {
      const result = validateAnswerValue(q, ["a", "z"]);
      expect(result.ok).toBe(false);
    });

    it("배열이 아니면 거절", () => {
      const result = validateAnswerValue(q, "a");
      expect(result.ok).toBe(false);
    });

    it("배열 원소가 string 아니면 거절", () => {
      const result = validateAnswerValue(q, [1, 2]);
      expect(result.ok).toBe(false);
    });
  });

  describe("likert", () => {
    const q = {
      type: "likert" as const,
      options: { min: 1, max: 5 },
    };

    it("범위 안 정수는 통과 (min 경계)", () => {
      const result = validateAnswerValue(q, 1);
      expect(result.ok).toBe(true);
    });

    it("범위 안 정수는 통과 (max 경계)", () => {
      const result = validateAnswerValue(q, 5);
      expect(result.ok).toBe(true);
    });

    it("범위 밖 정수는 거절 (max+1)", () => {
      const result = validateAnswerValue(q, 6);
      expect(result.ok).toBe(false);
    });

    it("범위 밖 정수는 거절 (min-1)", () => {
      const result = validateAnswerValue(q, 0);
      expect(result.ok).toBe(false);
    });

    it("비정수 number 는 거절", () => {
      const result = validateAnswerValue(q, 3.5);
      expect(result.ok).toBe(false);
    });

    it("string 은 거절 ('3' 같은 숫자 문자열 포함)", () => {
      const result = validateAnswerValue(q, "3");
      expect(result.ok).toBe(false);
    });
  });

  describe("ranking", () => {
    const q = {
      type: "ranking" as const,
      options: ["a", "b", "c"],
    };

    it("옵션 셋과 동치 + 중복 없는 배열은 통과", () => {
      const result = validateAnswerValue(q, ["b", "a", "c"]);
      expect(result.ok).toBe(true);
    });

    it("순서 다르고 동치이면 통과", () => {
      const result = validateAnswerValue(q, ["c", "b", "a"]);
      expect(result.ok).toBe(true);
    });

    it("원소 누락은 거절", () => {
      const result = validateAnswerValue(q, ["a", "b"]);
      expect(result.ok).toBe(false);
    });

    it("중복 있으면 거절", () => {
      const result = validateAnswerValue(q, ["a", "a", "b"]);
      expect(result.ok).toBe(false);
    });

    it("옵션 밖 값이 포함되면 거절", () => {
      const result = validateAnswerValue(q, ["a", "b", "z"]);
      expect(result.ok).toBe(false);
    });

    it("배열이 아니면 거절", () => {
      const result = validateAnswerValue(q, "a");
      expect(result.ok).toBe(false);
    });
  });

  describe("text", () => {
    const q = {
      type: "text" as const,
      options: { placeholder: "자유롭게 적어주세요" },
    };

    it("≤2000 글자 문자열은 통과", () => {
      const result = validateAnswerValue(q, "보통 길이의 텍스트입니다");
      expect(result.ok).toBe(true);
    });

    it("빈 문자열도 통과 (required 검증은 별 layer)", () => {
      const result = validateAnswerValue(q, "");
      expect(result.ok).toBe(true);
    });

    it("정확히 2000 글자는 통과 (경계)", () => {
      const result = validateAnswerValue(q, "x".repeat(2000));
      expect(result.ok).toBe(true);
    });

    it(">2000 글자는 거절", () => {
      const result = validateAnswerValue(q, "x".repeat(2001));
      expect(result.ok).toBe(false);
    });

    it("non-string 은 거절 (number)", () => {
      const result = validateAnswerValue(q, 123);
      expect(result.ok).toBe(false);
    });

    it("non-string 은 거절 (object)", () => {
      const result = validateAnswerValue(q, { text: "hi" });
      expect(result.ok).toBe(false);
    });

    it("options 가 비어있어도 통과 (text 는 options 없어도 됨)", () => {
      const result = validateAnswerValue(
        { type: "text", options: null },
        "텍스트",
      );
      expect(result.ok).toBe(true);
    });
  });
});
