import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import {
  getSurvey,
  listChapters,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { listFriends } from "@/lib/db/friends";
import { SurveyEditor } from "@/components/operator/survey-editor";
import { CustomSurveyMeta } from "./meta";

export const dynamic = "force-dynamic";

export default async function CustomSurveyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOperator();
  const survey = await getSurvey(session.userId, id);
  if (!survey || survey.type !== "custom") notFound();
  const [chapters, questions, friends] = await Promise.all([
    listChapters(survey.id),
    listQuestionsBySurvey(survey.id),
    listFriends(session.userId),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          <Link href="/surveys" className="hover:text-fg">
            설문
          </Link>
          <span className="mx-1">/</span> 커스텀
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{survey.title}</h1>
      </div>
      <CustomSurveyMeta survey={survey} friends={friends} />
      <SurveyEditor
        surveyId={survey.id}
        chapters={chapters}
        questions={questions}
        allowText={true}
      />
    </div>
  );
}
