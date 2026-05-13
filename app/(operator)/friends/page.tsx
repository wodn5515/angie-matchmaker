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
  type Gender,
  type RelationshipStatus,
  type MatchInterest,
} from "@/lib/types/domain";
import { getRegionLabel, getJobLabel } from "@/lib/types/v2-options";
import { formatDate } from "@/lib/utils";

// 카드 한눈 식별용 매핑 — 성별/관계/매칭관심도를 시각 단계로 구분.
// 운영자 톤(Linear admin)의 핑크는 강조에만 — 여 + 매칭 적극 두 핵심 신호에만 부여.
const GENDER_CHIP: Record<Gender, { glyph: string; className: string; aria: string }> = {
  female: {
    glyph: "♀",
    className: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    aria: "여성",
  },
  male: {
    glyph: "♂",
    className: "bg-[var(--color-surface-2)] text-fg border-[var(--color-border-strong)]",
    aria: "남성",
  },
  other: {
    glyph: "·",
    className: "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)] border-[var(--color-border)]",
    aria: "기타",
  },
};

// single 은 success 로 매칭 풀 활성 강조. complicated 만 warn 으로 분리.
const RELATIONSHIP_VARIANT: Record<
  RelationshipStatus,
  "success" | "outline" | "warn" | "neutral"
> = {
  single: "success",
  dating: "outline",
  married: "outline",
  complicated: "warn",
  unknown: "neutral",
};

// high=pink 그대로 (운영자 시선 핵심 신호), medium=warn 단계 추가, low/none 약하게.
const MATCH_INTEREST_VARIANT: Record<
  MatchInterest,
  "pink" | "warn" | "outline" | "neutral"
> = {
  high: "pink",
  medium: "warn",
  low: "outline",
  none: "neutral",
};

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
            description="가입 페이지 링크(/login) 를 지인에게 공유해보세요. Google 로그인으로 누구나 가입할 수 있어요."
          />
        ) : (
          <EmptyState title="조건에 맞는 가입자가 없어요" />
        )
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((f) => {
            const pct = profileCompletion(f);
            const genderChip = GENDER_CHIP[f.gender];
            return (
              <li key={f.id} data-friend-card>
                <Link href={`/friends/${f.id}`} className="block">
                  <Card className="h-full transition hover:border-pink-500/40 hover:bg-[var(--color-surface-2)]">
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span
                            aria-label={genderChip.aria}
                            title={GENDER_LABEL[f.gender]}
                            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[14px] font-semibold leading-none ${genderChip.className}`}
                          >
                            {genderChip.glyph}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-fg">
                              {f.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
                              {f.birth_year ? `${f.birth_year}년생` : "출생연도 미입력"}
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
                          <Badge variant={RELATIONSHIP_VARIANT[f.relationship_status]}>
                            {RELATIONSHIP_STATUS_LABEL[f.relationship_status]}
                          </Badge>
                        ) : null}
                        {f.match_interest ? (
                          <Badge variant={MATCH_INTEREST_VARIANT[f.match_interest]}>
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
