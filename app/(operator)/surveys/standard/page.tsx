import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import {
  ensureStandardSurvey,
  listChapters,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { SurveyEditor } from "@/components/operator/survey-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "표준 연애 성향 테스트 — matchmaker" };

export default async function StandardSurveyEditorPage() {
  const session = await requireOperator();
  const survey = await ensureStandardSurvey(session.userId);
  const [chapters, questions] = await Promise.all([
    listChapters(survey.id),
    listQuestionsBySurvey(survey.id),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          <Link href="/surveys" className="hover:text-fg">
            연애 성향 테스트
          </Link>
          <span className="mx-1">/</span> 표준
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{survey.title}</h1>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          모든 가입자가 동일하게 받는 테스트예요. 챕터식 진행이라 길어도 괜찮습니다.
        </p>
      </div>
      <SurveyEditor
        surveyId={survey.id}
        chapters={chapters}
        questions={questions}
        allowText={false}
      />
    </div>
  );
}
