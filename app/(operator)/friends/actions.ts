"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import { deleteFriend, updateFriend } from "@/lib/db/friends";

/**
 * V2 운영자가 가입자 정보 수정 / 삭제할 때 쓰는 Server Action.
 *
 * 운영자가 직접 신규 가입자를 만드는 흐름은 V2 에서 폐기됐다 (decisions/004).
 * 따라서 createFriendAction 은 제거.
 *
 * status / rejected_reason 은 별도 review action (`[id]/actions.ts`) 가 담당.
 */
const FriendUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다").max(60),
  gender: z.enum(["male", "female", "other"]),
  preferred_gender: z.enum(["male", "female", "any"]),
  // 가입 시 입력된 추천인 정보의 의도를 보존 — 운영자도 임의로 비우지 못하게 min(1).
  // 운영자가 다른 필드만 수정할 경우 폼이 defaultValue 로 기존 값을 그대로 제출하므로
  // 자연 통과한다.
  recommender_name: z
    .string()
    .trim()
    .min(1, "추천인 이름은 비울 수 없습니다")
    .max(80),
  recommender_relation: z
    .string()
    .trim()
    .min(1, "추천인 관계는 비울 수 없습니다")
    .max(120),
  birth_year: z
    .union([
      z.coerce.number().int().min(1900).max(new Date().getFullYear()),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  region: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  region_detail: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  hometown: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  hometown_detail: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  occupation: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  tags_csv: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    ),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  relationship_status: z
    .enum(["single", "dating", "married", "complicated", "unknown"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  match_interest: z
    .enum(["high", "medium", "low", "none"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  // 자기 보고 4 항목 (009). 운영자도 가입자 대신 보강 입력 가능 — 선택.
  smoking: z
    .enum(["non_smoker", "occasional", "regular"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  drinking: z
    .enum(["non_drinker", "sometimes", "often"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  marriage_view: z
    .enum(["within_2y", "over_3y", "dating_focus"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  tattoo: z
    .enum(["none", "small", "large"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
}).transform((data) => {
  // 012 §D1 CHECK 정합 — region 없이 detail 만 있는 경우 detail 을 null 로 정규화.
  return {
    ...data,
    region_detail: data.region ? data.region_detail : null,
    hometown_detail: data.hometown ? data.hometown_detail : null,
  };
});

export type FriendActionResult =
  | { ok: true; friendId: string }
  | { ok: false; error: string };

export async function updateFriendAction(
  friendId: string,
  formData: FormData,
): Promise<FriendActionResult> {
  const session = await requireOperator();
  const parsed = FriendUpdateSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  try {
    const { tags_csv, ...rest } = parsed.data;
    await updateFriend(session.userId, friendId, { ...rest, tags: tags_csv });
    revalidatePath("/friends");
    revalidatePath(`/friends/${friendId}`);
    return { ok: true, friendId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "가입자 정보 수정 실패",
    };
  }
}

export async function deleteFriendAction(friendId: string): Promise<void> {
  const session = await requireOperator();
  await deleteFriend(session.userId, friendId);
  revalidatePath("/friends");
  revalidatePath("/");
  redirect("/friends");
}
