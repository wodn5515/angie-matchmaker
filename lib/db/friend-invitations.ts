import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { newSurveyToken } from "@/lib/utils";
import type { FriendInput } from "@/lib/db/friends";

export type FriendInvitationStatus = "pending" | "used";

export type FriendInvitation = {
  id: string;
  owner_id: string;
  token: string;
  hint_name: string | null;
  hint_note: string | null;
  status: FriendInvitationStatus;
  friend_id: string | null;
  created_at: string;
  used_at: string | null;
};

export async function createFriendInvitation(
  ownerId: string,
  hintName: string | null,
  hintNote: string | null,
): Promise<FriendInvitation> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friend_invitations")
    .insert({
      owner_id: ownerId,
      token: newSurveyToken(),
      hint_name: hintName,
      hint_note: hintNote,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FriendInvitation;
}

export async function getFriendInvitationByToken(
  token: string,
): Promise<FriendInvitation | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("friend_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as FriendInvitation) ?? null;
}

export async function listFriendInvitations(
  ownerId: string,
  status?: FriendInvitationStatus,
): Promise<FriendInvitation[]> {
  const sb = createSupabaseServiceClient();
  let q = sb
    .from("friend_invitations")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FriendInvitation[];
}

export async function deleteFriendInvitation(
  ownerId: string,
  invitationId: string,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("friend_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("owner_id", ownerId);
  if (error) throw error;
}

/**
 * Friend-side: consume a pending invitation.
 *
 * Atomic at the application layer:
 * 1) Verify token + still pending.
 * 2) Insert the new friend with the invitation's owner_id.
 * 3) Mark invitation as used and link to the new friend id.
 *
 * Returns the new friend's id on success, or a structured failure for
 * the caller to render a friendly message.
 */
export async function consumeFriendInvitation(
  token: string,
  friendInput: FriendInput,
): Promise<
  | { ok: true; friendId: string; ownerName?: string }
  | { ok: false; reason: "not_found" | "already_used" }
> {
  const sb = createSupabaseServiceClient();

  const { data: inv, error: invErr } = await sb
    .from("friend_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!inv) return { ok: false, reason: "not_found" };
  if (inv.status === "used") return { ok: false, reason: "already_used" };

  const { data: friend, error: friendErr } = await sb
    .from("friends")
    .insert({ ...friendInput, owner_id: inv.owner_id })
    .select("id")
    .single();
  if (friendErr) throw friendErr;

  const { error: updateErr } = await sb
    .from("friend_invitations")
    .update({
      status: "used",
      friend_id: friend.id,
      used_at: new Date().toISOString(),
    })
    .eq("id", inv.id);
  if (updateErr) throw updateErr;

  return { ok: true, friendId: friend.id };
}
