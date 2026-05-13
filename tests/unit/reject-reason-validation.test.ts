/**
 * D3 — `rejectFriendAction` `rejected_reason` 길이 제한 단위 테스트.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D3
 *
 * 현재 구현은 `String(formData.get("rejected_reason") ?? "").trim()` 으로 받기만 하고
 * 길이 제한이 없다. 운영자가 실수로 거대한 텍스트를 붙여 넣으면 그대로 저장 — DB 부담.
 * `notes` 같은 운영자 입력 필드와 동일 규약 (`z.string().trim().max(2000).optional()`)
 * 으로 통일.
 *
 * worker 가 채울 인터페이스 (zod schema 로 분리해 단위 테스트 가능하게):
 *   // 위치: app/(operator)/friends/[id]/actions.ts 또는 lib/validation/reject-reason.ts
 *   //   Lead 의 채택 가이드: 어디든 export 되기만 하면 spec 은 path 만 변경 가능.
 *   import { RejectReasonSchema } from "@/lib/validation/reject-reason";
 *
 *   // 통과: undefined | string (trim 후 길이 0~2000)
 *   // 거절: string (trim 후 >2000) | non-string (number/object/array/null)
 *   //
 *   // zod schema 의 표준 parse / safeParse 인터페이스로 검증.
 *
 * Schema 정의 가정 (worker 가 채울 정확한 형태):
 *
 *   export const RejectReasonSchema = z
 *     .string()
 *     .trim()
 *     .max(2000)
 *     .optional();
 *
 * spec 은 `.safeParse(value).success` 만 확인 — schema 내부 구현 자유.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 가 아직 작성하지 않은 모듈 — 빨강 보장
import { RejectReasonSchema } from "@/lib/validation/reject-reason";

describe("RejectReasonSchema — rejected_reason 검증 (D3)", () => {
  it("빈 문자열은 통과", () => {
    const result = RejectReasonSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("일반 문자열은 통과", () => {
    const result = RejectReasonSchema.safeParse("추천인이 확인 안 됨");
    expect(result.success).toBe(true);
  });

  it("undefined 는 통과 (optional)", () => {
    const result = RejectReasonSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("앞뒤 공백은 trim 되어 통과", () => {
    const result = RejectReasonSchema.safeParse("   사유   ");
    expect(result.success).toBe(true);
    // trim 결과는 parsed 값에서 확인
    if (result.success) {
      expect(result.data).toBe("사유");
    }
  });

  it("정확히 2000 글자는 통과 (경계)", () => {
    const result = RejectReasonSchema.safeParse("x".repeat(2000));
    expect(result.success).toBe(true);
  });

  it(">2000 글자는 거절", () => {
    const result = RejectReasonSchema.safeParse("x".repeat(2001));
    expect(result.success).toBe(false);
  });

  it("앞뒤 공백 포함 trim 후 >2000 은 거절", () => {
    // 공백 포함 길이 2010, trim 결과 2010 → 거절
    const result = RejectReasonSchema.safeParse("x".repeat(2010));
    expect(result.success).toBe(false);
  });

  it("number 는 거절", () => {
    const result = RejectReasonSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it("object 는 거절", () => {
    const result = RejectReasonSchema.safeParse({ reason: "x" });
    expect(result.success).toBe(false);
  });

  it("array 는 거절", () => {
    const result = RejectReasonSchema.safeParse(["x"]);
    expect(result.success).toBe(false);
  });

  it("null 은 거절 (optional 은 undefined 만 허용)", () => {
    const result = RejectReasonSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
