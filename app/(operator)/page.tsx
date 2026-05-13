import { requireOperator } from "@/lib/auth/operator";
import {
  listFriends,
  getFriendStatusCounts,
} from "@/lib/db/friends";
import { ensureStandardSurvey, listQuestionsBySurvey } from "@/lib/db/surveys";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  DashboardEmpty,
  PendingReviewWidget,
  QuickJumpWidget,
  UserStatsWidget,
  type PendingReviewItem,
  type UserStats,
} from "@/components/operator/dashboard-widgets";

export const dynamic = "force-dynamic";

/**
 * V2 운영자 대시보드.
 * PRD §3.6 + §6.4 — ⏳ 심사 대기 / 📊 가입자 현황 / 빠른 진입.
 */
export default async function DashboardPage() {
  const session = await requireOperator();

  const [friends, counts] = await Promise.all([
    listFriends(session.userId),
    getFriendStatusCounts(session.userId),
  ]);

  // 설문 응답 통계 — 본 표준 설문의 응답자 수
  const standard = await ensureStandardSurvey(session.userId);
  const questions = await listQuestionsBySurvey(standard.id);
  const service = createSupabaseServiceClient();
  let surveyDone = 0;
  if (questions.length > 0 && friends.length > 0) {
    const friendIds = friends.map((f) => f.id);
    const { data: answerCounts } = await service
      .from("survey_answers")
      .select("friend_id")
      .in("friend_id", friendIds)
      .in(
        "question_id",
        questions.map((q) => q.id),
      );
    // friend_id 별 응답 갯수 — 전 문항 응답한 가입자만 surveyDone
    const counter = new Map<string, number>();
    for (const a of answerCounts ?? []) {
      counter.set(a.friend_id, (counter.get(a.friend_id) ?? 0) + 1);
    }
    surveyDone = Array.from(counter.values()).filter(
      (c) => c === questions.length,
    ).length;
  }

  const pending: PendingReviewItem[] = friends
    .filter((f) => f.status === "pending")
    .map((f) => ({
      id: f.id,
      name: f.name,
      created_at: f.created_at,
      recommender_name: f.recommender_name ?? "",
      recommender_relation: f.recommender_relation ?? "",
      match_interest: f.match_interest,
    }));

  const stats: UserStats = {
    total: counts.all,
    approved: counts.approved,
    pending: counts.pending,
    rejected: counts.rejected,
    matchInterestHigh: friends.filter((f) => f.match_interest === "high").length,
    surveyDone,
    surveyTotal: friends.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">대시보드</p>
          <h1 className="text-2xl font-semibold tracking-tight">관제실</h1>
        </div>
      </div>

      {friends.length === 0 ? (
        <DashboardEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <PendingReviewWidget
            items={pending}
            totalPending={counts.pending}
          />
          <UserStatsWidget stats={stats} />
        </div>
      )}

      <QuickJumpWidget />
    </div>
  );
}
