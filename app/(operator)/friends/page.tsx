import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import {
  listFriendsByStatus,
  getFriendStatusCounts,
  profileCompletion,
} from "@/lib/db/friends";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { FriendsFilter } from "./friends-filter";
import { FriendsStatusTabs } from "@/components/operator/friends-status-tabs";
import {
  GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
  FRIEND_STATUS_LABEL,
  type FriendStatus,
} from "@/lib/types/domain";
import { getRegionLabel, getJobLabel } from "@/lib/types/v2-options";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isFriendStatus(v: string | undefined): v is FriendStatus | "all" {
  return v === "all" || v === "pending" || v === "approved" || v === "rejected";
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    gender?: string;
    mi?: string;
    status?: string;
  }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const active = isFriendStatus(sp.status) ? sp.status : "all";

  const [friendsByStatus, counts] = await Promise.all([
    listFriendsByStatus(session.userId, active),
    getFriendStatusCounts(session.userId),
  ]);

  const q = (sp.q ?? "").toLowerCase().trim();
  const friends = friendsByStatus.filter((f) => {
    if (q) {
      const hay = [
        f.name,
        f.region,
        f.hometown,
        f.occupation,
        f.recommender_name,
        f.recommender_relation,
        ...(f.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (sp.gender && sp.gender !== "all" && f.gender !== sp.gender) return false;
    if (sp.mi && sp.mi !== "all" && f.match_interest !== sp.mi) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">가입자 관리</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            가입자 ({counts.all})
          </h1>
        </div>
      </div>

      <FriendsStatusTabs active={active} counts={counts} />

      <FriendsFilter
        q={sp.q ?? ""}
        gender={sp.gender ?? "all"}
        mi={sp.mi ?? "all"}
      />

      {friends.length === 0 ? (
        counts.all === 0 ? (
          <EmptyState
            title="아직 가입자가 없어요"
            description="가입 페이지 링크(/signup) 를 지인에게 공유해보세요. Google 로그인으로 누구나 가입할 수 있어요."
          />
        ) : (
          <EmptyState title="조건에 맞는 가입자가 없어요" />
        )
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((f) => {
            const pct = profileCompletion(f);
            return (
              <li key={f.id} data-friend-card>
                <Link href={`/friends/${f.id}`} className="block">
                  <Card className="h-full transition hover:border-pink-500/40 hover:bg-[var(--color-surface-2)]">
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-fg">
                            {f.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
                            {GENDER_LABEL[f.gender]}
                            {f.birth_year ? ` · ${f.birth_year}년생` : ""}
                            {f.region ? ` · ${getRegionLabel(f.region)}` : ""}
                            {f.occupation
                              ? ` · ${getJobLabel(f.occupation)}`
                              : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)] truncate">
                            추천: {f.recommender_name || "(없음)"}
                            {f.recommender_relation
                              ? ` (${f.recommender_relation})`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge
                            variant={
                              f.status === "approved"
                                ? "success"
                                : f.status === "rejected"
                                  ? "danger"
                                  : "warn"
                            }
                          >
                            {FRIEND_STATUS_LABEL[f.status]}
                          </Badge>
                          <p className="mt-1 text-[10px] text-[var(--color-fg-muted)]">
                            {pct}%
                          </p>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                        <div
                          className="h-full bg-pink-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {f.relationship_status ? (
                          <Badge variant="outline">
                            {RELATIONSHIP_STATUS_LABEL[f.relationship_status]}
                          </Badge>
                        ) : null}
                        {f.match_interest ? (
                          <Badge
                            variant={
                              f.match_interest === "high"
                                ? "pink"
                                : f.match_interest === "none"
                                  ? "neutral"
                                  : "outline"
                            }
                          >
                            매칭 {MATCH_INTEREST_LABEL[f.match_interest]}
                          </Badge>
                        ) : null}
                        {f.onboarding_step != null ? (
                          <Badge variant="warn">
                            온보딩 진행 중 (step {f.onboarding_step})
                          </Badge>
                        ) : null}
                        {(f.tags ?? []).slice(0, 3).map((t) => (
                          <Badge key={t} variant="neutral">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--color-fg-subtle)]">
                        가입 {formatDate(f.created_at)}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
