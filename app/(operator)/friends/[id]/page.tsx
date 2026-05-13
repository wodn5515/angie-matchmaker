import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { getFriend, listFriends, profileCompletion } from "@/lib/db/friends";
import { getFriendIdealAggregate } from "@/lib/db/ideals";
import { listAnswersForFriend } from "@/lib/db/answers";
import {
  ensureStandardSurvey,
  listChapters,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GENDER_LABEL,
  PREFERRED_GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
  FRIEND_STATUS_LABEL,
} from "@/lib/types/domain";
import { REGION_LABEL } from "@/lib/types/v2-options";
import { AnswerView } from "@/components/operator/answer-display";
import { FriendIdealSection } from "@/components/operator/friend-ideal-section";
import { ReviewActions } from "@/components/operator/review-actions";
import { DeleteFriendButton } from "./delete-button";
import { ComparePicker } from "./compare-picker";
import {
  approveFriendAction,
  rejectFriendAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOperator();

  const [friend, otherFriends, idealAggregate] = await Promise.all([
    getFriend(session.userId, id),
    listFriends(session.userId),
    getFriendIdealAggregate(id),
  ]);
  if (!friend) notFound();

  // V2 표준 설문 응답
  const standard = await ensureStandardSurvey(session.userId);
  const [chapters, questions, answers] = await Promise.all([
    listChapters(standard.id),
    listQuestionsBySurvey(standard.id),
    listAnswersForFriend(friend.id),
  ]);
  const ansByQ = new Map(answers.map((a) => [a.question_id, a.value]));

  const others = otherFriends.filter((f) => f.id !== friend.id);
  const pct = profileCompletion(friend);

  // Server action bindings for review actions
  const approveAction = approveFriendAction.bind(null, friend.id);
  const rejectAction = rejectFriendAction.bind(null, friend.id);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-fg-muted)]">
            <Link href="/friends" className="hover:text-fg">
              가입자
            </Link>
            <span className="mx-1">/</span> 상세
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {friend.name}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            {GENDER_LABEL[friend.gender]} · 선호{" "}
            {PREFERRED_GENDER_LABEL[friend.preferred_gender]}
            {friend.birth_year ? ` · ${friend.birth_year}년생` : ""}
            {friend.region
              ? ` · 거주 ${REGION_LABEL[friend.region] ?? friend.region}`
              : ""}
            {friend.occupation ? ` · ${friend.occupation}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
            추천: {friend.recommender_name || "(없음)"}
            {friend.recommender_relation
              ? ` · ${friend.recommender_relation}`
              : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Link href={`/friends/${friend.id}/edit`}>
              <Button variant="secondary" size="sm">
                수정
              </Button>
            </Link>
            <DeleteFriendButton friendId={friend.id} friendName={friend.name} />
          </div>
        </div>
      </div>

      <ReviewActions
        status={friend.status}
        approveAction={approveAction}
        rejectAction={rejectAction}
        initialRejectedReason={friend.rejected_reason ?? ""}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>프로필 완성도</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-semibold text-pink-400">
                {pct}%
              </span>
              <Badge
                variant={
                  friend.status === "approved"
                    ? "success"
                    : friend.status === "rejected"
                      ? "danger"
                      : "warn"
                }
              >
                {FRIEND_STATUS_LABEL[friend.status]}
              </Badge>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full bg-pink-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {friend.onboarding_step != null ? (
              <p className="mt-2 text-[11px] text-[var(--color-warn)]">
                ⏳ 온보딩 진행 중 (step {friend.onboarding_step})
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>가입자 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field
              label="이메일"
              value={friend.email ?? "—"}
            />
            <Field
              label="출신 지역"
              value={
                friend.hometown
                  ? REGION_LABEL[friend.hometown] ?? friend.hometown
                  : "—"
              }
            />
            <Field
              label="연애 상태"
              value={
                friend.relationship_status
                  ? RELATIONSHIP_STATUS_LABEL[friend.relationship_status]
                  : "—"
              }
            />
            <Field
              label="매칭 관심도"
              value={
                friend.match_interest
                  ? MATCH_INTEREST_LABEL[friend.match_interest]
                  : "—"
              }
            />
            <Field
              label="인스타그램"
              value={friend.instagram ?? "—"}
            />
            <Field
              label="추천인"
              value={
                friend.recommender_name
                  ? `${friend.recommender_name} (${friend.recommender_relation || "—"})`
                  : "—"
              }
            />
            <div className="sm:col-span-2 flex flex-wrap gap-1.5">
              {(friend.tags ?? []).map((t) => (
                <Badge key={t} variant="neutral">
                  #{t}
                </Badge>
              ))}
            </div>
            {friend.notes ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  운영자 메모
                </p>
                <p className="mt-1 whitespace-pre-wrap text-fg">
                  {friend.notes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-fg">💞 이상형</h2>
        <FriendIdealSection
          ideal={
            idealAggregate.ideals ||
            idealAggregate.regions.length > 0 ||
            idealAggregate.hometowns.length > 0 ||
            idealAggregate.jobs.length > 0 ||
            idealAggregate.personality_keywords.length > 0 ||
            idealAggregate.priorities.length > 0
              ? {
                  age_from: idealAggregate.ideals?.age_from ?? null,
                  age_to: idealAggregate.ideals?.age_to ?? null,
                  regions: idealAggregate.regions,
                  hometowns: idealAggregate.hometowns,
                  hometown_same_bonus:
                    idealAggregate.ideals?.hometown_same_bonus ?? false,
                  smoking: idealAggregate.ideals?.smoking ?? null,
                  drinking: idealAggregate.ideals?.drinking ?? null,
                  marriage_timing:
                    idealAggregate.ideals?.marriage_timing ?? null,
                  jobs: idealAggregate.jobs,
                  tattoo: idealAggregate.ideals?.tattoo ?? null,
                  personality_keywords: idealAggregate.personality_keywords,
                  free_text: idealAggregate.ideals?.free_text ?? null,
                  priorities: idealAggregate.priorities,
                }
              : null
          }
        />
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>💌 연애 성향 테스트 응답</CardTitle>
          <span className="text-[11px] text-[var(--color-fg-muted)]">
            {answers.length}/{questions.length} 응답
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {answers.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
              아직 설문 응답이 없어요.
            </p>
          ) : (
            <div className="space-y-3 px-5 py-4">
              {chapters.map((ch, ci) => {
                const chapterQuestions = questions.filter(
                  (q) => q.chapter_id === ch.id,
                );
                if (chapterQuestions.length === 0) return null;
                const chapterHasAnswer = chapterQuestions.some((q) =>
                  ansByQ.has(q.id),
                );
                if (!chapterHasAnswer) return null;
                return (
                  <div key={ch.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="pink">챕터 {ci + 1}</Badge>
                      <h4 className="text-xs font-semibold text-fg">
                        {ch.title}
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {chapterQuestions.map((q, qi) => (
                        <li
                          key={q.id}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2"
                        >
                          <p className="text-[11px] text-[var(--color-fg-muted)]">
                            Q{qi + 1}
                          </p>
                          <p className="text-sm text-fg">{q.prompt}</p>
                          <div className="mt-2 text-sm">
                            <AnswerView
                              question={q}
                              value={ansByQ.get(q.id)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <ComparePicker friendId={friend.id} otherFriends={others} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--color-fg-muted)]">{label}</p>
      <p className="mt-0.5 text-fg">{value}</p>
    </div>
  );
}
