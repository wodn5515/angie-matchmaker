import { notFound, redirect } from "next/navigation";
import { getInvitationByToken } from "@/lib/db/invitations";
import { ChapterRunner } from "./chapter-runner";

export const dynamic = "force-dynamic";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ token: string; chapter: string }>;
}) {
  const { token, chapter } = await params;
  const idx = parseInt(chapter, 10);
  if (Number.isNaN(idx)) notFound();

  const bundle = await getInvitationByToken(token);
  if (!bundle) notFound();
  if (bundle.invitation.status === "completed") {
    redirect(`/s/${token}/done`);
  }
  if (bundle.chapters.length === 0) redirect(`/s/${token}`);
  if (idx < 0 || idx >= bundle.chapters.length) notFound();

  const chapterDef = bundle.chapters[idx];
  const questions = bundle.questions
    .filter((q) => q.chapter_id === chapterDef.id)
    .sort((a, b) => a.order_index - b.order_index);

  const answersInitial: Record<string, unknown> = {};
  for (const a of bundle.answers) {
    answersInitial[a.question_id] = a.value;
  }

  return (
    <ChapterRunner
      token={token}
      chapterIndex={idx}
      totalChapters={bundle.chapters.length}
      chapter={chapterDef}
      questions={questions}
      initialAnswers={answersInitial}
      friendName={bundle.friend.name}
    />
  );
}
