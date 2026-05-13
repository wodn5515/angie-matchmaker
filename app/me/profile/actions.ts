"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireOnboardedUser, ensureNotOperator } from "@/lib/auth/user";
import { ProfileObjectSchema } from "@/lib/validation/profile";
import {
  REGION_OPTIONS,
  REGION_DETAIL_OPTIONS,
  type RegionCode,
} from "@/lib/types/v2-options";

// 012 nit #3 — server-side enum 검증 (defense-in-depth) — ProfileSchema 와
// 동일 패턴. recommender_* 를 omit 한 변형이라 별도 transform 으로 다시 적용.
const VALID_REGION_CODES: ReadonlySet<string> = new Set(
  REGION_OPTIONS.map((o) => o.value),
);

function isValidDetailFor(region: string, detail: string): boolean {
  const arr = REGION_DETAIL_OPTIONS[region as RegionCode];
  if (!arr) return false;
  return arr.some((d) => d.value === detail);
}

/**
 * `/me/profile` — 승인된 가입자가 본인 프로필 수정.
 *
 * 본인은 추천인 (recommender_name, recommender_relation) 을 변경할 수 없다 —
 * 가입 시 1회 입력 후 운영자만 수정 가능 (PRD §3.3.2 의도).
 *
 * 폼에서 두 필드가 `disabled` 라 FormData submit 에 포함되지 않으므로,
 * server schema 도 두 필드를 omit 한 변형을 사용해 validation 실패를 피하고,
 * 클라이언트가 hidden input 으로 임의 값을 보내도 server 가 무시한다.
 */
const MeProfileSchema = ProfileObjectSchema.omit({
  recommender_name: true,
  recommender_relation: true,
}).transform((data, ctx) => {
  // 012 §D1 CHECK 정합 + nit #3 enum 검증.
  if (data.region && !VALID_REGION_CODES.has(data.region)) {
    ctx.addIssue({
      code: "custom",
      path: ["region"],
      message: "알 수 없는 거주지역 코드입니다",
    });
  }
  if (data.hometown && !VALID_REGION_CODES.has(data.hometown)) {
    ctx.addIssue({
      code: "custom",
      path: ["hometown"],
      message: "알 수 없는 출신지역 코드입니다",
    });
  }
  const region_detail =
    data.region && data.region_detail && isValidDetailFor(data.region, data.region_detail)
      ? data.region_detail
      : null;
  const hometown_detail =
    data.hometown &&
    data.hometown_detail &&
    isValidDetailFor(data.hometown, data.hometown_detail)
      ? data.hometown_detail
      : null;
  return {
    ...data,
    region_detail: data.region ? region_detail : null,
    hometown_detail: data.hometown ? hometown_detail : null,
  };
});

export async function updateMeProfileAction(formData: FormData): Promise<void> {
  await ensureNotOperator();
  const session = await requireOnboardedUser();
  const parsed = MeProfileSchema.parse(Object.fromEntries(formData.entries()));

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("friends")
    .update(parsed)
    .eq("id", session.friendId);
  if (error) throw error;

  redirect("/me");
}
