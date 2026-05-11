"use server";

import { z } from "zod";
import { consumeFriendInvitation } from "@/lib/db/friend-invitations";
import type { FriendInput } from "@/lib/db/friends";

const Schema = z.object({
  token: z.string(),
  // Tier 1 — required
  name: z.string().trim().min(1, "이름은 필수예요").max(60),
  gender: z.enum(["male", "female", "other"]),
  preferred_gender: z.enum(["male", "female", "any"]),
  // Tier 2 — optional
  birth_year: z
    .union([
      z.coerce.number().int().min(1900).max(new Date().getFullYear()),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  region: z.string().trim().max(80).optional().transform((v) => v || null),
  occupation: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  // Tier 3 — optional
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  kakao_id: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  // Status — friend can self-report
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

export type RegistrationResult =
  | { ok: true }
  | { ok: false; reason: "invalid_input" | "not_found" | "already_used" | "server_error"; message?: string };

export async function submitRegistrationAction(
  input: unknown,
): Promise<RegistrationResult> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "입력 오류",
    };
  }
  const friendInput: FriendInput = {
    name: parsed.data.name,
    gender: parsed.data.gender,
    preferred_gender: parsed.data.preferred_gender,
    birth_year: parsed.data.birth_year,
    region: parsed.data.region,
    occupation: parsed.data.occupation,
    closeness: null,
    how_we_met: null,
    tags: [],
    instagram: parsed.data.instagram,
    kakao_id: parsed.data.kakao_id,
    phone: parsed.data.phone,
    notes: null,
    relationship_status:
      parsed.data.relationship_status as FriendInput["relationship_status"],
    match_interest:
      parsed.data.match_interest as FriendInput["match_interest"],
  };
  try {
    const res = await consumeFriendInvitation(parsed.data.token, friendInput);
    if (!res.ok) return { ok: false, reason: res.reason };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "server_error",
      message: e instanceof Error ? e.message : "등록에 실패했어요",
    };
  }
}
