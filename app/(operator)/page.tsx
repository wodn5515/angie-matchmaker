import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listFriends, profileCompletion } from "@/lib/db/friends";
import { listAllInvitationsForOwner } from "@/lib/db/invitations";
import { recentPairs } from "@/lib/db/pairs";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PAIR_OUTCOME_LABEL } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireOperator();

  const [friends, invitations, recent] = await Promise.all([
    listFriends(session.userId),
    listAllInvitationsForOwner(session.userId),
    recentPairs(session.userId, 5),
  ]);

  const pending = invitations.filter((i) => i.status !== "completed");
  const completed = invitations.filter((i) => i.status === "completed");

  // "New responses": completed within the last 7 days.
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newResponses = completed.filter(
    (i) =>
      i.completed_at != null &&
      new Date(i.completed_at).getTime() >= sevenDaysAgo,
  );

  const avgCompletion =
    friends.length > 0
      ? Math.round(
          friends.map(profileCompletion).reduce((a, b) => a + b, 0) /
            friends.length,
        )
      : 0;

  const friendNameById = new Map(friends.map((f) => [f.id, f.name] as const));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">대시보드</p>
          <h1 className="text-2xl font-semibold tracking-tight">관제실</h1>
        </div>
        <Link href="/friends/new">
          <Button>＋ 친구 등록</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="응답 대기 중"
          value={pending.length}
          hint="아직 답변되지 않은 설문 수"
          tone="pink"
        />
        <StatCard
          label="새 응답 (7일)"
          value={newResponses.length}
          hint="최근 7일간 완료된 설문 수"
          tone="success"
        />
        <StatCard
          label="친구 수"
          value={friends.length}
          hint="등록된 인물"
        />
        <StatCard
          label="평균 완성도"
          value={`${avgCompletion}%`}
          hint="프로필 평균"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>응답 대기 중인 설문</CardTitle>
            <Link
              href="/invitations"
              className="text-xs text-pink-400 hover:text-pink-300"
            >
              관리하기 →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {pending.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
                아직 응답 대기 중인 설문이 없어요.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {pending.slice(0, 6).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-fg truncate">
                        {friendNameById.get(inv.friend_id) ?? "삭제된 친구"}
                      </p>
                      <p className="text-[11px] text-[var(--color-fg-muted)]">
                        {formatDateTime(inv.created_at)} 발송
                      </p>
                    </div>
                    <Badge
                      variant={inv.status === "in_progress" ? "warn" : "outline"}
                    >
                      {inv.status === "in_progress" ? "응답 중" : "미응답"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>최근 매칭</CardTitle>
            <Link
              href="/matches"
              className="text-xs text-pink-400 hover:text-pink-300"
            >
              모두 보기
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
                아직 매칭 기록이 없어요.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {recent.map((p) => {
                  const a = friendNameById.get(p.friend_a_id) ?? "?";
                  const b = friendNameById.get(p.friend_b_id) ?? "?";
                  return (
                    <li key={p.id} className="px-5 py-3">
                      <Link
                        href={`/compare?a=${p.friend_a_id}&b=${p.friend_b_id}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-fg">
                          {a} <span className="text-pink-400">↔</span> {b}
                        </span>
                        <span className="flex items-center gap-2">
                          {p.outcome ? (
                            <Badge
                              variant={
                                p.outcome === "good"
                                  ? "success"
                                  : p.outcome === "bad"
                                    ? "danger"
                                    : "outline"
                              }
                            >
                              {PAIR_OUTCOME_LABEL[p.outcome]}
                            </Badge>
                          ) : null}
                          <span className="text-[11px] text-[var(--color-fg-muted)]">
                            {formatDate(p.introduced_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickLink
          href="/friends"
          title="친구 관리"
          desc="등록 / 수정 / 비교"
        />
        <QuickLink
          href="/surveys"
          title="설문 관리"
          desc="표준·커스텀 설문 편집"
        />
        <QuickLink
          href="/send"
          title="설문 발송"
          desc="친구에게 1회용 링크 발급"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "pink" | "success";
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)]">
          {label}
        </p>
        <p
          className={
            "mt-1 text-2xl font-semibold " +
            (tone === "pink"
              ? "text-pink-400"
              : tone === "success"
                ? "text-[var(--color-success)]"
                : "text-fg")
          }
        >
          {value}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{hint}</p>
      </CardBody>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition hover:border-pink-500/40 hover:bg-[var(--color-surface-2)]">
        <CardBody>
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{desc}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
