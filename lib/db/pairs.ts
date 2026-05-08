import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Pair, PairOutcome } from "@/lib/types/domain";
import { pairKey } from "@/lib/utils";

export async function getOrCreatePair(
  ownerId: string,
  a: string,
  b: string,
): Promise<Pair> {
  if (a === b) throw new Error("Cannot pair a friend with themselves");
  const { aid, bid } = pairKey(a, b);
  const sb = createSupabaseServiceClient();
  const { data: existing, error } = await sb
    .from("pairs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("friend_a_id", aid)
    .eq("friend_b_id", bid)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as Pair;

  const { data, error: insErr } = await sb
    .from("pairs")
    .insert({
      owner_id: ownerId,
      friend_a_id: aid,
      friend_b_id: bid,
    })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return data as Pair;
}

export async function getPair(
  ownerId: string,
  a: string,
  b: string,
): Promise<Pair | null> {
  const { aid, bid } = pairKey(a, b);
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("pairs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("friend_a_id", aid)
    .eq("friend_b_id", bid)
    .maybeSingle();
  if (error) throw error;
  return (data as Pair) ?? null;
}

export async function updatePair(
  ownerId: string,
  pairId: string,
  patch: Partial<
    Pick<
      Pair,
      | "comparison_memo"
      | "introduced"
      | "introduced_at"
      | "outcome"
      | "outcome_memo"
    >
  >,
): Promise<Pair> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("pairs")
    .update(patch)
    .eq("owner_id", ownerId)
    .eq("id", pairId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Pair;
}

export async function listIntroducedPairs(
  ownerId: string,
  outcome?: PairOutcome,
): Promise<Pair[]> {
  const sb = createSupabaseServiceClient();
  let query = sb
    .from("pairs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("introduced", true)
    .order("introduced_at", { ascending: false, nullsFirst: false });
  if (outcome) query = query.eq("outcome", outcome);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Pair[];
}

export async function recentPairs(
  ownerId: string,
  limit = 5,
): Promise<Pair[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("pairs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("introduced", true)
    .order("introduced_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Pair[];
}
