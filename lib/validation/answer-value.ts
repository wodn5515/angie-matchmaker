/**
 * `survey_answers.value` server-side 유효성 검증.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D1
 *
 * 가입자 측 server action 이 받는 `value: unknown` 을 question.type / question.options
 * 에 따라 검증한다. 검증 없이 그대로 upsert 하면 임의 페이로드가 survey_answers 에
 * 오염될 수 있다.
 *
 * 외부 호출은 항상 `validateAnswerValue(question, value)` 한 진입점.
 * 거절 사유 문자열은 디버깅용 — UI 노출 책임은 호출 측.
 */

import type {
  ChoiceOptions,
  LikertOptions,
  QuestionType,
  RankingOptions,
} from "@/lib/types/domain";

export type AnswerValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const TEXT_MAX_LENGTH = 2000;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isChoiceOptions(options: unknown): options is ChoiceOptions {
  return Array.isArray(options) && options.every((o) => typeof o === "string");
}

function isLikertOptions(options: unknown): options is LikertOptions {
  if (typeof options !== "object" || options === null) return false;
  const o = options as Record<string, unknown>;
  return typeof o.min === "number" && typeof o.max === "number";
}

function validateMcqSingle(
  options: unknown,
  value: unknown,
): AnswerValidationResult {
  if (typeof value !== "string") {
    return { ok: false, reason: "mcq_single_not_string" };
  }
  if (!isChoiceOptions(options)) {
    return { ok: false, reason: "mcq_single_options_invalid" };
  }
  if (!options.includes(value)) {
    return { ok: false, reason: "mcq_single_value_not_in_options" };
  }
  return { ok: true };
}

function validateMcqMulti(
  options: unknown,
  value: unknown,
): AnswerValidationResult {
  if (!isStringArray(value)) {
    return { ok: false, reason: "mcq_multi_not_string_array" };
  }
  if (!isChoiceOptions(options)) {
    return { ok: false, reason: "mcq_multi_options_invalid" };
  }
  const set = new Set(options);
  if (!value.every((v) => set.has(v))) {
    return { ok: false, reason: "mcq_multi_value_not_in_options" };
  }
  return { ok: true };
}

function validateLikert(
  options: unknown,
  value: unknown,
): AnswerValidationResult {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, reason: "likert_not_integer" };
  }
  if (!isLikertOptions(options)) {
    return { ok: false, reason: "likert_options_invalid" };
  }
  if (value < options.min || value > options.max) {
    return { ok: false, reason: "likert_out_of_range" };
  }
  return { ok: true };
}

function validateRanking(
  options: unknown,
  value: unknown,
): AnswerValidationResult {
  if (!isStringArray(value)) {
    return { ok: false, reason: "ranking_not_string_array" };
  }
  if (!isChoiceOptions(options)) {
    return { ok: false, reason: "ranking_options_invalid" };
  }
  // 옵션 셋과 정확히 동치 + 중복 없음
  if (value.length !== (options as RankingOptions).length) {
    return { ok: false, reason: "ranking_length_mismatch" };
  }
  const uniq = new Set(value);
  if (uniq.size !== value.length) {
    return { ok: false, reason: "ranking_has_duplicates" };
  }
  const optionSet = new Set(options);
  if (!value.every((v) => optionSet.has(v))) {
    return { ok: false, reason: "ranking_value_not_in_options" };
  }
  return { ok: true };
}

function validateText(value: unknown): AnswerValidationResult {
  if (typeof value !== "string") {
    return { ok: false, reason: "text_not_string" };
  }
  if (value.length > TEXT_MAX_LENGTH) {
    return { ok: false, reason: "text_too_long" };
  }
  return { ok: true };
}

export function validateAnswerValue(
  question: { type: QuestionType; options: unknown },
  value: unknown,
): AnswerValidationResult {
  switch (question.type) {
    case "mcq_single":
      return validateMcqSingle(question.options, value);
    case "mcq_multi":
      return validateMcqMulti(question.options, value);
    case "likert":
      return validateLikert(question.options, value);
    case "ranking":
      return validateRanking(question.options, value);
    case "text":
      return validateText(value);
    default:
      return { ok: false, reason: "unknown_question_type" };
  }
}
