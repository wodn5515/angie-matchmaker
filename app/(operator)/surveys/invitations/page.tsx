import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listAllInvitationsForOwner } from "@/lib/db/invitations";
import { listFriends } from "@/lib/db/friends";
import {
  ensureStandardSurvey,
  listCustomSurveys,
} from "@/lib/db/surveys";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { InvitationRow } from "./invitation-row";
import type { Survey } from "@/lib/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "발송 이력 — matchmaker" };

type Tab = "pending" | "completed";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireOperator();
  const sp = await searchParams;
  const tab: Tab = sp.status === "completed" ? "completed" : "pending";

  const [allInvitations, friends, standard, customs] = await Promise.all([
    listAllInvitationsForOwner(session.userId),
    listFriends(session.userId),
    ensureStandardSurvey(session.userId),
    listCustomSurveys(session.userId),
  ]);

  const friendName = new Map(friends.map((f) => [f.id, f.name] as const));
  const surveyById = new Map<string, Survey>();
  surveyById.set(standard.id, standard);
  for (const c of customs) surveyById.set(c.id, c);

  const pending = allInvitations.filter((i) => i.status !== "completed");
  const completed = allInvitations.filter((i) => i.status === "completed");

  const list = tab === "pending" ? pending : completed;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-fg-muted)]">발송 이력</p>
          <h1 className="text-2xl font-semibold tracking-tight">설문 발송 관리</h1>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            보낸 설문의 응답 상태를 보고, 링크를 다시 보내거나 취소·삭제할 수 있어요.
          </p>
        </div>
        <Link href="/surveys/send">
          <Button>＋ 새로 보내기</Button>
        </Link>
      </div>

      <Tabs tab={tab} pendingCount={pending.length} completedCount={completed.length} />

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "pending" ? "응답 대기 중" : "응답 완료됨"}
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {list.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                title={
                  tab === "pending"
                    ? "응답 대기 중인 설문이 없어요"
                    : "응답 완료된 설문이 없어요"
                }
                description={
                  tab === "pending"
                    ? "새 설문을 보내려면 우측 상단의 '새로 보내기' 버튼을 눌러주세요."
                    : "친구가 설문에 응답을 완료하면 여기 쌓입니다."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {list.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  friendName={friendName.get(inv.friend_id) ?? "삭제된 친구"}
                  survey={surveyById.get(inv.survey_id) ?? null}
                  appUrl={appUrl}
                  variant={tab}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Tabs({
  tab,
  pendingCount,
  completedCount,
}: {
  tab: Tab;
  pendingCount: number;
  completedCount: number;
}) {
  const items: { value: Tab; label: string; count: number }[] = [
    { value: "pending", label: "대기중", count: pendingCount },
    { value: "completed", label: "완료됨", count: completedCount },
  ];
  return (
    <div className="flex gap-1.5">
      {items.map((it) => {
        const active = it.value === tab;
        const href =
          it.value === "pending"
            ? "/surveys/invitations"
            : `/surveys/invitations?status=${it.value}`;
        return (
          <Link
            key={it.value}
            href={href}
            className={
              "rounded-full px-3 py-1.5 text-xs transition border " +
              (active
                ? "border-pink-500/50 bg-pink-500/15 text-pink-300"
                : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-fg")
            }
          >
            {it.label}{" "}
            <span className="ml-1 text-[10px] opacity-80">{it.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
