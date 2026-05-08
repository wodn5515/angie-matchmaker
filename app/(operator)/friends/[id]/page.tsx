import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { getFriend, listFriends, profileCompletion } from "@/lib/db/friends";
import { listInvitationsForFriend } from "@/lib/db/invitations";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import {
  GENDER_LABEL,
  PREFERRED_GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
} from "@/lib/types/domain";
import { DeleteFriendButton } from "./delete-button";
import { ComparePicker } from "./compare-picker";

export const dynamic = "force-dynamic";

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOperator();
  const [friend, otherFriends, invitations] = await Promise.all([
    getFriend(session.userId, id),
    listFriends(session.userId),
    listInvitationsForFriend(id),
  ]);
  if (!friend) notFound();

  const others = otherFriends.filter((f) => f.id !== friend.id);
  const pct = profileCompletion(friend);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-fg-muted)]">
            <Link href="/friends" className="hover:text-fg">
              친구
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
            {friend.region ? ` · ${friend.region}` : ""}
            {friend.occupation ? ` · ${friend.occupation}` : ""}
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
              {pct < 100 ? (
                <Link
                  href={`/friends/${friend.id}/edit`}
                  className="text-xs text-pink-400 hover:text-pink-300"
                >
                  채우기 →
                </Link>
              ) : (
                <Badge variant="success">완료</Badge>
              )}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full bg-pink-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>상태 / 매칭 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2 text-sm">
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
            <Field label="친밀도" value={friend.closeness ? `${friend.closeness}/5` : "—"} />
            <Field label="알게 된 경위" value={friend.how_we_met ?? "—"} />
            <div className="sm:col-span-2 flex flex-wrap gap-1.5">
              {(friend.tags ?? []).map((t) => (
                <Badge key={t} variant="neutral">
                  #{t}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>연락처 / 메모</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2 text-sm">
          <Field label="인스타그램" value={friend.instagram ?? "—"} />
          <Field label="카카오 ID" value={friend.kakao_id ?? "—"} />
          <Field label="전화" value={friend.phone ?? "—"} />
          <div className="md:col-span-2">
            <p className="text-[11px] text-[var(--color-fg-muted)]">자유 메모</p>
            <p className="mt-1 whitespace-pre-wrap text-fg">
              {friend.notes ?? "—"}
            </p>
          </div>
        </CardBody>
      </Card>

      <ComparePicker friendId={friend.id} otherFriends={others} />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>설문 발송 / 응답 이력</CardTitle>
          <Link
            href={`/send?friendId=${friend.id}`}
            className="text-xs text-pink-400 hover:text-pink-300"
          >
            새 설문 보내기 →
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {invitations.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
              아직 발송 이력이 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-fg">
                      {inv.status === "completed"
                        ? "응답 완료"
                        : inv.status === "in_progress"
                          ? "응답 중"
                          : "미응답"}
                    </p>
                    <p className="text-[11px] text-[var(--color-fg-muted)]">
                      발송 {formatDateTime(inv.created_at)}
                      {inv.completed_at
                        ? ` · 완료 ${formatDateTime(inv.completed_at)}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      inv.status === "completed"
                        ? "success"
                        : inv.status === "in_progress"
                          ? "warn"
                          : "outline"
                    }
                  >
                    {inv.status === "completed"
                      ? "완료"
                      : inv.status === "in_progress"
                        ? "진행중"
                        : "대기"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
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
