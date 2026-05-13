import { notFound, redirect } from "next/navigation";
import { UserShell } from "@/components/user/user-shell";
import { getCurrentUser } from "@/lib/auth/user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  ensureStandardSurvey,
  listChapters,
  listQuestionsByChapter,
} from "@/lib/db/surveys";
import { listAnswersForFriend } from "@/lib/db/answers";
import { SITE_OWNER_ID } from "@/lib/auth/operator";
import { ChapterRunner } from "./chapter-runner";

export const dynamic = "force-dynamic";

/**
 * V2 `/me/survey/[chapter]` — 한 챕터 응답 페이지.
 *
 * V1 의 `/s/[token]/[chapter]` UX 를 OAuth 진입으로 재구성.
 * 진행 가능 가입자:
 *   - status='pending' + onboarding_step != null (온보딩 중)
 *   - status='approved' (자기 페이지에서 수정)
 */
export default async function MeSurveyChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter: chapterId } = await params;

  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.status === "rejected") redirect("/rejected");

  // 표준 설문 + 현 챕터
  const standard = await ensureStandardSurvey(SITE_OWNER_ID);
  const chapters = await listChapters(standard.id);
  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  if (chapterIndex === -1) notFound();
  const chapter = chapters[chapterIndex];

  const questions = await listQuestionsByChapter(chapterId);

  // 기존 답변 (이 챕터 문항에 한해서) prefill
  const service = createSupabaseServiceClient();
  const { data: friend } = await service
    .from("friends")
    .select("name")
    .eq("id", session.friendId)
    .single();

  const answers = await listAnswersForFriend(
    session.friendId,
    questions.map((q) => q.id),
  );
  const initialAnswers = Object.fromEntries(
    answers.map((a) => [a.question_id, a.value]),
  );

  return (
    <UserShell>
      <ChapterRunner
        chapterIndex={chapterIndex}
        totalChapters={chapters.length}
        chapter={chapter}
        nextChapterId={chapters[chapterIndex + 1]?.id ?? null}
        questions={questions}
        initialAnswers={initialAnswers}
        friendName={friend?.name ?? ""}
      />
    </UserShell>
  );
}
