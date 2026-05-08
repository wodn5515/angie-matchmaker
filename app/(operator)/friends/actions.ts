"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import {
  createFriend,
  deleteFriend,
  updateFriend,
  type FriendInput,
} from "@/lib/db/friends";

const FriendSchema = z.object({
  // Tier 1
  name: z.string().trim().min(1, "이름은 필수입니다").max(60),
  gender: z.enum(["male", "female", "other"]),
  preferred_gender: z.enum(["male", "female", "any"]),
  // Tier 2
  birth_year: z
    .union([z.coerce.number().int().min(1900).max(new Date().getFullYear()), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  region: z.string().trim().max(80).optional().transform((v) => v || null),
  occupation: z.string().trim().max(80).optional().transform((v) => v || null),
  closeness: z
    .union([z.coerce.number().int().min(1).max(5), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  how_we_met: z.string().trim().max(200).optional().transform((v) => v || null),
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
  // Tier 3
  instagram: z.string().trim().max(80).optional().transform((v) => v || null),
  kakao_id: z.string().trim().max(80).optional().transform((v) => v || null),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  notes: z.string().trim().max(2000).optional().transform((v) => v || null),
  // Status
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

function toFriendInput(parsed: z.infer<typeof FriendSchema>): FriendInput {
  return {
    name: parsed.name,
    gender: parsed.gender,
    preferred_gender: parsed.preferred_gender,
    birth_year: parsed.birth_year,
    region: parsed.region,
    occupation: parsed.occupation,
    closeness: parsed.closeness,
    how_we_met: parsed.how_we_met,
    tags: parsed.tags_csv,
    instagram: parsed.instagram,
    kakao_id: parsed.kakao_id,
    phone: parsed.phone,
    notes: parsed.notes,
    relationship_status: parsed.relationship_status as FriendInput["relationship_status"],
    match_interest: parsed.match_interest as FriendInput["match_interest"],
  };
}

export type FriendActionResult =
  | { ok: true; friendId: string }
  | { ok: false; error: string };

export async function createFriendAction(
  formData: FormData,
): Promise<FriendActionResult> {
  const session = await requireOperator();
  const parsed = FriendSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  try {
    const friend = await createFriend(session.userId, toFriendInput(parsed.data));
    revalidatePath("/friends");
    revalidatePath("/");
    return { ok: true, friendId: friend.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "친구를 등록하지 못했습니다",
    };
  }
}

export async function updateFriendAction(
  friendId: string,
  formData: FormData,
): Promise<FriendActionResult> {
  const session = await requireOperator();
  const parsed = FriendSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  try {
    await updateFriend(session.userId, friendId, toFriendInput(parsed.data));
    revalidatePath("/friends");
    revalidatePath(`/friends/${friendId}`);
    return { ok: true, friendId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "친구 정보 수정 실패",
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
