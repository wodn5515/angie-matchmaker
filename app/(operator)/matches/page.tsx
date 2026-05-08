import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listIntroducedPairs } from "@/lib/db/pairs";
import { listFriends } from "@/lib/db/friends";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDate } from "@/lib/utils";
import { PAIR_OUTCOME_LABEL, type PairOutcome } from "@/lib/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "매칭 이력 — matchmaker" };

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "good", label: "잘됨" },
  { value: "in_progress", label: "진행중" },
  { value: "bad", label: "별로" },
  { value: "unknown", label: "모름" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const outcome = sp.outcome && sp.outcome !== "all" ? sp.outcome : undefined;

  const [pairs, friends] = await Promise.all([
    listIntroducedPairs(session.userId, outcome as PairOutcome | undefined),
    listFriends(session.userId),
  ]);

  const friendNames = new Map(friends.map((f) => [f.id, f.name] as const));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">매칭 이력</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          소개한 쌍 ({pairs.length})
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active =
            (sp.outcome ?? "all") === f.value || (!sp.outcome && f.value === "all");
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/matches" : `/matches?outcome=${f.value}`}
              className={
                "rounded-full px-3 py-1 text-xs transition border " +
                (active
                  ? "border-pink-500/50 bg-pink-500/15 text-pink-300"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-fg")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {pairs.length === 0 ? (
        <EmptyState title="매칭 이력이 없어요" description="비교 뷰에서 '소개 기록' 버튼을 눌러보세요." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>이력</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {pairs.map((p) => {
                const a = friendNames.get(p.friend_a_id) ?? "?";
                const b = friendNames.get(p.friend_b_id) ?? "?";
                return (
                  <li key={p.id}>
                    <Link
                      href={`/compare?a=${p.friend_a_id}&b=${p.friend_b_id}`}
                      className="block px-5 py-3 hover:bg-[var(--color-surface-2)]/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-fg">
                            {a} <span className="text-pink-400">↔</span> {b}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
                            {formatDate(p.introduced_at)}
                            {p.outcome_memo
                              ? ` · ${truncate(p.outcome_memo, 60)}`
                              : ""}
                          </p>
                        </div>
                        {p.outcome ? (
                          <Badge
                            variant={
                              p.outcome === "good"
                                ? "success"
                                : p.outcome === "bad"
                                  ? "danger"
                                  : p.outcome === "in_progress"
                                    ? "warn"
                                    : "outline"
                            }
                          >
                            {PAIR_OUTCOME_LABEL[p.outcome]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">결과 미입력</Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
