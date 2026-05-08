import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  Survey,
  SurveyChapter,
  SurveyQuestion,
  QuestionType,
} from "@/lib/types/domain";

export async function getActiveStandardSurvey(
  ownerId: string,
): Promise<Survey | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("type", "standard")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Survey) ?? null;
}

export async function ensureStandardSurvey(ownerId: string): Promise<Survey> {
  const existing = await getActiveStandardSurvey(ownerId);
  if (existing) return existing;
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .insert({
      owner_id: ownerId,
      type: "standard",
      title: "표준 설문",
      description: "모든 친구에게 보내는 기본 설문입니다.",
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function listCustomSurveys(ownerId: string): Promise<Survey[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("type", "custom")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Survey[];
}

export async function getSurvey(
  ownerId: string,
  surveyId: string,
): Promise<Survey | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw error;
  return (data as Survey) ?? null;
}

export async function createCustomSurvey(
  ownerId: string,
  title: string,
  description: string | null,
  targetFriendId: string | null,
): Promise<Survey> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .insert({
      owner_id: ownerId,
      type: "custom",
      title,
      description,
      target_friend_id: targetFriendId,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function updateSurvey(
  ownerId: string,
  surveyId: string,
  patch: Partial<
    Pick<Survey, "title" | "description" | "is_active" | "target_friend_id">
  >,
): Promise<Survey> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("surveys")
    .update(patch)
    .eq("owner_id", ownerId)
    .eq("id", surveyId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function deleteSurvey(
  ownerId: string,
  surveyId: string,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("surveys")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", surveyId);
  if (error) throw error;
}

// ----- Chapters -----

export async function listChapters(surveyId: string): Promise<SurveyChapter[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_chapters")
    .select("*")
    .eq("survey_id", surveyId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SurveyChapter[];
}

export async function createChapter(
  surveyId: string,
  title: string,
  description: string | null,
  orderIndex: number,
): Promise<SurveyChapter> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_chapters")
    .insert({
      survey_id: surveyId,
      title,
      description,
      order_index: orderIndex,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyChapter;
}

export async function updateChapter(
  chapterId: string,
  patch: Partial<
    Pick<SurveyChapter, "title" | "description" | "result_template" | "order_index">
  >,
): Promise<SurveyChapter> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_chapters")
    .update(patch)
    .eq("id", chapterId)
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyChapter;
}

export async function deleteChapter(chapterId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("survey_chapters")
    .delete()
    .eq("id", chapterId);
  if (error) throw error;
}

// ----- Questions -----

export async function listQuestionsBySurvey(
  surveyId: string,
): Promise<SurveyQuestion[]> {
  const sb = createSupabaseServiceClient();
  const { data: chapters, error: cErr } = await sb
    .from("survey_chapters")
    .select("id")
    .eq("survey_id", surveyId);
  if (cErr) throw cErr;
  const chapterIds = (chapters ?? []).map((c) => c.id as string);
  if (chapterIds.length === 0) return [];
  const { data, error } = await sb
    .from("survey_questions")
    .select("*")
    .in("chapter_id", chapterIds)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SurveyQuestion[];
}

export async function listQuestionsByChapter(
  chapterId: string,
): Promise<SurveyQuestion[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_questions")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SurveyQuestion[];
}

export async function createQuestion(
  chapterId: string,
  payload: {
    type: QuestionType;
    prompt: string;
    options: unknown;
    required: boolean;
    orderIndex: number;
  },
): Promise<SurveyQuestion> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_questions")
    .insert({
      chapter_id: chapterId,
      type: payload.type,
      prompt: payload.prompt,
      options: payload.options,
      required: payload.required,
      order_index: payload.orderIndex,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyQuestion;
}

export async function updateQuestion(
  questionId: string,
  patch: Partial<{
    type: QuestionType;
    prompt: string;
    options: unknown;
    required: boolean;
    order_index: number;
  }>,
): Promise<SurveyQuestion> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("survey_questions")
    .update(patch)
    .eq("id", questionId)
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyQuestion;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("survey_questions")
    .delete()
    .eq("id", questionId);
  if (error) throw error;
}
