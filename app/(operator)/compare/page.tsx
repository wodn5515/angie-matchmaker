import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { getFriendsByIds, listFriends } from "@/lib/db/friends";
import {
  ensureStandardSurvey,
  listChapters,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { listAnswersForFriendOnSurvey } from "@/lib/db/invitations";
import { getOrCreatePair } from "@/lib/db/pairs";
import { CompareSelector } from "./selector";
import { CompareView } from "./compare-view";
import { MetadataComparison } from "./metadata-comparison";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const all = await listFriends(session.userId);

  if (!sp.a || !sp.b) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">비교</p>
          <h1 className="text-2xl font-semibold tracking-tight">두 명 고르기</h1>
        </div>
        <CompareSelector friends={all} />
      </div>
    );
  }

  if (sp.a === sp.b) redirect("/compare");

  const fetched = await getFriendsByIds(session.userId, [sp.a, sp.b]);
  const friendA = fetched.find((f) => f.id === sp.a);
  const friendB = fetched.find((f) => f.id === sp.b);
  if (!friendA || !friendB) redirect("/compare");

  const standard = await ensureStandardSurvey(session.userId);
  const [chapters, questions, answersA, answersB, pair] = await Promise.all([
    listChapters(standard.id),
    listQuestionsBySurvey(standard.id),
    listAnswersForFriendOnSurvey(friendA.id, standard.id),
    listAnswersForFriendOnSurvey(friendB.id, standard.id),
    getOrCreatePair(session.userId, friendA.id, friendB.id),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          <Link href="/compare" className="hover:text-fg">
            비교
          </Link>
          <span className="mx-1">/</span> {friendA.name} ↔ {friendB.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {friendA.name} <span className="text-pink-400">↔</span> {friendB.name}
        </h1>
      </div>

      <MetadataComparison friendA={friendA} friendB={friendB} />

      <CompareView
        friendA={friendA}
        friendB={friendB}
        chapters={chapters}
        questions={questions}
        answersA={answersA}
        answersB={answersB}
        pair={pair}
      />
    </div>
  );
}
