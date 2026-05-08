import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listFriends, profileCompletion } from "@/lib/db/friends";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { FriendsFilter } from "./friends-filter";
import {
  GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
} from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gender?: string; mi?: string }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const all = await listFriends(session.userId);

  const q = (sp.q ?? "").toLowerCase().trim();
  const friends = all.filter((f) => {
    if (q) {
      const hay = [f.name, f.region, f.occupation, ...(f.tags ?? [])]
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">친구 관리</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            친구 ({all.length})
          </h1>
        </div>
        <Link href="/friends/new">
          <Button>＋ 새 친구</Button>
        </Link>
      </div>

      <FriendsFilter q={sp.q ?? ""} gender={sp.gender ?? "all"} mi={sp.mi ?? "all"} />

      {friends.length === 0 ? (
        all.length === 0 ? (
          <EmptyState
            title="아직 등록된 친구가 없어요"
            description="첫 친구를 등록해보세요. 이름, 성별, 선호 성별만 있어도 시작할 수 있어요."
            action={
              <Link href="/friends/new">
                <Button>＋ 새 친구 등록</Button>
              </Link>
            }
          />
        ) : (
          <EmptyState title="조건에 맞는 친구가 없어요" />
        )
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((f) => {
            const pct = profileCompletion(f);
            return (
              <li key={f.id}>
                <Link href={`/friends/${f.id}`} className="block">
                  <Card className="h-full transition hover:border-pink-500/40 hover:bg-[var(--color-surface-2)]">
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-fg">
                            {f.name}
                          </p>
                          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
                            {GENDER_LABEL[f.gender]}
                            {f.birth_year ? ` · ${f.birth_year}년생` : ""}
                            {f.region ? ` · ${f.region}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-[var(--color-fg-muted)]">
                            완성도
                          </p>
                          <p className="text-xs font-semibold text-pink-400">
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
                        {(f.tags ?? []).slice(0, 3).map((t) => (
                          <Badge key={t} variant="neutral">
                            #{t}
                          </Badge>
                        ))}
                      </div>
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
