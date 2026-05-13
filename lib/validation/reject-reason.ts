import { z } from "zod";

/**
 * 운영자 거절 사유 (`friends.rejected_reason`) 검증 스키마.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D3
 *
 * 운영자가 실수로 거대한 텍스트를 붙여 넣을 경우를 차단. `notes` 같은 운영자 입력
 * 필드와 동일 규약(`z.string().trim().max(2000).optional()`)으로 통일.
 *
 * - 통과: undefined | string (trim 후 길이 0~2000)
 * - 거절: trim 후 >2000 인 string, number/object/array/null
 */
export const RejectReasonSchema = z
  .string()
  .trim()
  .max(2000)
  .optional();

export type RejectReason = z.infer<typeof RejectReasonSchema>;
