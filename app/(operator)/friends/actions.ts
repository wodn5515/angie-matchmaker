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
  recommender_name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v ?? ""),
  recommender_relation: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v ?? ""),
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
  hometown: z
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
