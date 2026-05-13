import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Friend, FriendStatus } from "@/lib/types/domain";

export async function listFriends(ownerId: string): Promise<Friend[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Friend[];
}

export async function listFriendsByStatus(
  ownerId: string,
  status: FriendStatus | "all",
): Promise<Friend[]> {
  const sb = createSupabaseServiceClient();
  let q = sb
    .from("friends")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Friend[];
}

export type FriendStatusCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

export async function getFriendStatusCounts(
  ownerId: string,
): Promise<FriendStatusCounts> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .select("status")
    .eq("owner_id", ownerId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ status: FriendStatus }>;
  const counts: FriendStatusCounts = {
    all: rows.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const r of rows) {
    if (r.status === "pending") counts.pending++;
    else if (r.status === "approved") counts.approved++;
    else if (r.status === "rejected") counts.rejected++;
  }
  return counts;
}

export async function getFriend(
  ownerId: string,
  friendId: string,
): Promise<Friend | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", friendId)
    .maybeSingle();
  if (error) throw error;
  return (data as Friend) ?? null;
}

export async function getFriendsByIds(
  ownerId: string,
  ids: string[],
): Promise<Friend[]> {
  if (ids.length === 0) return [];
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .select("*")
    .eq("owner_id", ownerId)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as Friend[];
}

export type FriendInput = Omit<
  Friend,
  "id" | "owner_id" | "created_at" | "updated_at" | "auth_user_id" | "email"
>;

export async function createFriend(
  ownerId: string,
  input: FriendInput,
): Promise<Friend> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .insert({ ...input, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Friend;
}

export async function updateFriend(
  ownerId: string,
  friendId: string,
  input: Partial<Friend>,
): Promise<Friend> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friends")
    .update(input)
    .eq("owner_id", ownerId)
    .eq("id", friendId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Friend;
}

export async function deleteFriend(
  ownerId: string,
  friendId: string,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("friends")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", friendId);
  if (error) throw error;
}

/**
 * 가입자 프로필 완성도 (0..100).
 *
 * V2.x: 필수(이름·성별·선호 성별·추천인 2) = base 30.
 *       권장 11 (birth_year/region/hometown/occupation/instagram/relationship_status/
 *       match_interest/smoking/drinking/marriage_view/tattoo) 각 1/11 균일 비중으로 최대 70점.
 *       가입자 입력만으로 100% 도달. 운영자 메모(tags/notes) 는 완성도에 포함하지 않음.
 */
export function profileCompletion(f: Friend): number {
  // Required base (모든 V2 가입자는 통과해서 row 가 만들어졌으므로 30점 기본)
  let score = 30;
  const tier2Items = [
    f.birth_year != null,
    !!f.region,
    !!f.hometown,
    !!f.occupation,
    !!f.instagram,
    f.relationship_status != null,
    f.match_interest != null,
    !!f.smoking,
    !!f.drinking,
    !!f.marriage_view,
    !!f.tattoo,
  ];
  score += Math.round(
    (tier2Items.filter(Boolean).length / tier2Items.length) * 70,
  );
  return Math.min(100, score);
}
