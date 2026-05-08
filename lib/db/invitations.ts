import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  SurveyInvitation,
  InvitationStatus,
  Friend,
  Survey,
  SurveyChapter,
  SurveyQuestion,
  SurveyAnswer,
} from "@/lib/types/domain";
import { newSurveyToken } from "@/lib/utils";

export async function createInvitation(
  ownerId: string,
  friendId: string,
  surveyId: string,
): Promise<SurveyInvitation> {
  const sb = createSupabaseServiceClient();
  // Defensive ownership check.
  const { data: friend, error: fErr } = await sb
    .from("friends")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("id", friendId)
    .maybeSingle();
  if (fErr) throw fErr;
  if (!friend) throw new Error("Friend not found");

  const { data: survey, error: sErr } = await sb
    .from("surveys")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("id", surveyId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!survey) throw new Error("Survey not found");

  const { data, error } = await sb
    .from("survey_invitations")
    .insert({
      friend_id: friendId,
      survey_id: surveyId,
      token: newSurveyToken(),
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyInvitation;
}

export async function listInvitationsForFriend(
  friendId: string,
): Promise<SurveyInvitation[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_invitations")
    .select("*")
    .eq("friend_id", friendId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SurveyInvitation[];
}

export async function listAllInvitationsForOwner(
  ownerId: string,
): Promise<SurveyInvitation[]> {
  const sb = createSupabaseServiceClient();
  // Pull invitations whose friend belongs to this owner.
  const { data: friends, error: fErr } = await sb
    .from("friends")
    .select("id")
    .eq("owner_id", ownerId);
  if (fErr) throw fErr;
  const ids = (friends ?? []).map((f) => f.id as string);
  if (ids.length === 0) return [];
  const { data, error } = await sb
    .from("survey_invitations")
    .select("*")
    .in("friend_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SurveyInvitation[];
}

export type InvitationBundle = {
  invitation: SurveyInvitation;
  friend: Friend;
  survey: Survey;
  chapters: SurveyChapter[];
  questions: SurveyQuestion[];
  answers: SurveyAnswer[];
};

/**
 * Friend-facing fetch: look up a survey invitation by its public token.
 * Uses the operator-authenticated server client; this function is called from
 * server-only contexts (Server Components / Server Actions).
 */
export async function getInvitationByToken(
  token: string,
): Promise<InvitationBundle | null> {
  const sb = createSupabaseServiceClient();
  const { data: inv, error } = await sb
    .from("survey_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!inv) return null;

  const [friendRes, surveyRes] = await Promise.all([
    sb.from("friends").select("*").eq("id", inv.friend_id).maybeSingle(),
    sb.from("surveys").select("*").eq("id", inv.survey_id).maybeSingle(),
  ]);

  if (friendRes.error) throw friendRes.error;
  if (surveyRes.error) throw surveyRes.error;
  if (!friendRes.data || !surveyRes.data) return null;

  const { data: chapters, error: chErr } = await sb
    .from("survey_chapters")
    .select("*")
    .eq("survey_id", inv.survey_id)
    .order("order_index", { ascending: true });
  if (chErr) throw chErr;

  const chapterIds = (chapters ?? []).map((c) => c.id as string);
  let questions: SurveyQuestion[] = [];
  if (chapterIds.length > 0) {
    const { data: qs, error: qErr } = await sb
      .from("survey_questions")
      .select("*")
      .in("chapter_id", chapterIds)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;
    questions = (qs ?? []) as SurveyQuestion[];
  }

  const { data: ans, error: aErr } = await sb
    .from("survey_answers")
    .select("*")
    .eq("invitation_id", inv.id);
  if (aErr) throw aErr;

  return {
    invitation: inv as SurveyInvitation,
    friend: friendRes.data as Friend,
    survey: surveyRes.data as Survey,
    chapters: (chapters ?? []) as SurveyChapter[],
    questions,
    answers: (ans ?? []) as SurveyAnswer[],
  };
}

export async function setInvitationStatus(
  invitationId: string,
  status: InvitationStatus,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
  }
  const { error } = await sb
    .from("survey_invitations")
    .update(patch)
    .eq("id", invitationId);
  if (error) throw error;
}

export async function upsertAnswer(
  invitationId: string,
  questionId: string,
  value: unknown,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("survey_answers")
    .upsert(
      {
        invitation_id: invitationId,
        question_id: questionId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id,question_id" },
    );
  if (error) throw error;
}

/**
 * Hard-delete an invitation. Verifies the invitation's friend belongs to
 * the given owner before deleting. ON DELETE CASCADE handles answers.
 */
export async function deleteInvitation(
  ownerId: string,
  invitationId: string,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data: inv, error: invErr } = await sb
    .from("survey_invitations")
    .select("id, friend_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!inv) throw new Error("Invitation not found");

  const { data: friend, error: friendErr } = await sb
    .from("friends")
    .select("id")
    .eq("id", inv.friend_id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (friendErr) throw friendErr;
  if (!friend) throw new Error("Not authorized");

  const { error } = await sb
    .from("survey_invitations")
    .delete()
    .eq("id", invitationId);
  if (error) throw error;
}

export async function listAnswersForFriendOnSurvey(
  friendId: string,
  surveyId: string,
): Promise<SurveyAnswer[]> {
  const sb = createSupabaseServiceClient();
  const { data: invs, error: invErr } = await sb
    .from("survey_invitations")
    .select("id")
    .eq("friend_id", friendId)
    .eq("survey_id", surveyId)
    .eq("status", "completed");
  if (invErr) throw invErr;
  const ids = (invs ?? []).map((i) => i.id as string);
  if (ids.length === 0) return [];
  const { data, error } = await sb
    .from("survey_answers")
    .select("*")
    .in("invitation_id", ids);
  if (error) throw error;
  return (data ?? []) as SurveyAnswer[];
}
