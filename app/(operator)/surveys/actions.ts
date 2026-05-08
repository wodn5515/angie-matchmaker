"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/auth/operator";
import {
  createChapter,
  createCustomSurvey,
  createQuestion,
  deleteChapter,
  deleteQuestion,
  deleteSurvey,
  ensureStandardSurvey,
  getSurvey,
  updateChapter,
  updateQuestion,
  updateSurvey,
} from "@/lib/db/surveys";
import type { QuestionType } from "@/lib/types/domain";

export async function ensureStandardAction(): Promise<{ surveyId: string }> {
  const session = await requireOperator();
  const survey = await ensureStandardSurvey(session.userId);
  revalidatePath("/surveys");
  return { surveyId: survey.id };
}

const ChapterSchema = z.object({
  surveyId: z.string().uuid(),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  resultTemplate: z.string().trim().max(300).optional(),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export async function createChapterAction(
  input: z.infer<typeof ChapterSchema>,
) {
  const session = await requireOperator();
  const parsed = ChapterSchema.parse(input);
  const survey = await getSurvey(session.userId, parsed.surveyId);
  if (!survey) throw new Error("Survey not found");
  await createChapter(
    parsed.surveyId,
    parsed.title,
    parsed.description ?? null,
    parsed.orderIndex,
  );
  revalidatePath(`/surveys/standard`);
  if (survey.type === "custom") {
    revalidatePath(`/surveys/custom/${parsed.surveyId}`);
  }
}

export async function updateChapterAction(
  chapterId: string,
  patch: {
    title?: string;
    description?: string | null;
    resultTemplate?: string | null;
    orderIndex?: number;
  },
) {
  await requireOperator();
  await updateChapter(chapterId, {
    title: patch.title,
    description: patch.description ?? null,
    result_template: patch.resultTemplate ?? null,
    order_index: patch.orderIndex,
  });
  revalidatePath(`/surveys/standard`);
}

export async function deleteChapterAction(chapterId: string) {
  await requireOperator();
  await deleteChapter(chapterId);
  revalidatePath(`/surveys/standard`);
}

const QuestionSchema = z.object({
  chapterId: z.string().uuid(),
  type: z.enum(["mcq_single", "mcq_multi", "likert", "ranking", "text"]),
  prompt: z.string().trim().min(1).max(300),
  options: z.unknown(),
  required: z.boolean().default(false),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export async function createQuestionAction(
  input: z.infer<typeof QuestionSchema>,
) {
  await requireOperator();
  const parsed = QuestionSchema.parse(input);
  await createQuestion(parsed.chapterId, {
    type: parsed.type as QuestionType,
    prompt: parsed.prompt,
    options: parsed.options ?? null,
    required: parsed.required,
    orderIndex: parsed.orderIndex,
  });
  revalidatePath(`/surveys/standard`);
}

export async function updateQuestionAction(
  questionId: string,
  patch: {
    prompt?: string;
    options?: unknown;
    required?: boolean;
    type?: QuestionType;
    orderIndex?: number;
  },
) {
  await requireOperator();
  await updateQuestion(questionId, {
    prompt: patch.prompt,
    options: patch.options,
    required: patch.required,
    type: patch.type,
    order_index: patch.orderIndex,
  });
  revalidatePath(`/surveys/standard`);
}

export async function deleteQuestionAction(questionId: string) {
  await requireOperator();
  await deleteQuestion(questionId);
  revalidatePath(`/surveys/standard`);
}

const CustomSurveySchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  targetFriendId: z.string().uuid().optional(),
});

export async function createCustomSurveyAction(
  input: z.infer<typeof CustomSurveySchema>,
) {
  const session = await requireOperator();
  const parsed = CustomSurveySchema.parse(input);
  const survey = await createCustomSurvey(
    session.userId,
    parsed.title,
    parsed.description ?? null,
    parsed.targetFriendId ?? null,
  );
  revalidatePath("/surveys");
  redirect(`/surveys/custom/${survey.id}`);
}

export async function updateCustomSurveyAction(
  surveyId: string,
  patch: { title?: string; description?: string | null; targetFriendId?: string | null },
) {
  const session = await requireOperator();
  await updateSurvey(session.userId, surveyId, {
    title: patch.title,
    description: patch.description ?? null,
    target_friend_id: patch.targetFriendId ?? null,
  });
  revalidatePath("/surveys");
  revalidatePath(`/surveys/custom/${surveyId}`);
}

export async function deleteCustomSurveyAction(surveyId: string) {
  const session = await requireOperator();
  await deleteSurvey(session.userId, surveyId);
  revalidatePath("/surveys");
  redirect("/surveys");
}
