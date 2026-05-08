import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import {
  getFriendsByIds,
  listFriends,
  profileCompletion,
} from "@/lib/db/friends";
import {
  ensureStandardSurvey,
  listChapters,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { listAnswersForFriendOnSurvey } from "@/lib/db/invitations";
import { getOrCreatePair } from "@/lib/db/pairs";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompareSelector } from "./selector";
import { CompareView } from "./compare-view";

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

  // The pair stores friend_a_id < friend_b_id canonical order.
  // Make sure the UI shows them in the URL order regardless.
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

      <div className="grid grid-cols-2 gap-3">
        <FriendBrief friend={friendA} pct={profileCompletion(friendA)} />
        <FriendBrief friend={friendB} pct={profileCompletion(friendB)} />
      </div>

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

function FriendBrief({
  friend,
  pct,
}: {
  friend: {
    id: string;
    name: string;
    notes: string | null;
    region: string | null;
    occupation: string | null;
    birth_year: number | null;
    tags: string[] | null;
  };
  pct: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{friend.name}</CardTitle>
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
          {friend.birth_year ? `${friend.birth_year}년생 · ` : ""}
          {friend.region ?? ""}
          {friend.occupation ? ` · ${friend.occupation}` : ""}
        </p>
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--color-fg-muted)]">완성도</span>
          <span className="text-pink-400 font-medium">{pct}%</span>
        </div>
        {(friend.tags ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(friend.tags ?? []).slice(0, 4).map((t) => (
              <Badge key={t} variant="neutral">
                #{t}
              </Badge>
            ))}
          </div>
        ) : null}
        {friend.notes ? (
          <p className="text-[11px] text-[var(--color-fg-muted)] line-clamp-3 whitespace-pre-wrap">
            {friend.notes}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
