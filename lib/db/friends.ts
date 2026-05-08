import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Friend } from "@/lib/types/domain";

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
  "id" | "owner_id" | "created_at" | "updated_at"
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
  input: Partial<FriendInput>,
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

/** Returns 0..100 reflecting how filled out the friend profile is. */
export function profileCompletion(f: Friend): number {
  // Tier 1 (fixed weight 30): name + gender + preferred_gender — always set
  let score = 30;
  // Tier 2 (40): birth_year, region, occupation, closeness, how_we_met, tags(any)
  const tier2Items = [
    f.birth_year != null,
    !!f.region,
    !!f.occupation,
    f.closeness != null,
    !!f.how_we_met,
    Array.isArray(f.tags) && f.tags.length > 0,
  ];
  score += Math.round((tier2Items.filter(Boolean).length / tier2Items.length) * 40);
  // Tier 3 (20): instagram, kakao_id, phone, notes
  const tier3Items = [!!f.instagram, !!f.kakao_id, !!f.phone, !!f.notes];
  score += Math.round((tier3Items.filter(Boolean).length / tier3Items.length) * 20);
  // Status (10): relationship_status, match_interest
  const statusItems = [
    f.relationship_status != null,
    f.match_interest != null,
  ];
  score += Math.round((statusItems.filter(Boolean).length / statusItems.length) * 10);
  return Math.min(100, score);
}
