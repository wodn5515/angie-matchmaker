import { requireOperator } from "@/lib/auth/operator";
import { listFriends } from "@/lib/db/friends";
import {
  ensureStandardSurvey,
  listChapters,
  listCustomSurveys,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { SendForm } from "./send-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "설문 발송 — matchmaker" };

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{ friendId?: string }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const [friends, standard, customs] = await Promise.all([
    listFriends(session.userId),
    ensureStandardSurvey(session.userId),
    listCustomSurveys(session.userId),
  ]);
  const [stdChapters, stdQs] = await Promise.all([
    listChapters(standard.id),
    listQuestionsBySurvey(standard.id),
  ]);
  const standardReady = stdChapters.length > 0 && stdQs.length > 0;

  const surveyOptions = [
    {
      id: standard.id,
      label: `[표준] ${standard.title}`,
      ready: standardReady,
    },
    ...customs.map((c) => ({
      id: c.id,
      label: `[커스텀] ${c.title}`,
      ready: true,
    })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">설문 발송</p>
        <h1 className="text-2xl font-semibold tracking-tight">새 설문 보내기</h1>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          친구와 설문을 고르면 1회용 링크가 생성돼요. 링크를 복사해서 카톡으로 보내세요.
        </p>
      </div>
      <SendForm
        friends={friends}
        surveys={surveyOptions}
        defaultFriendId={sp.friendId}
        standardReady={standardReady}
      />
    </div>
  );
}
