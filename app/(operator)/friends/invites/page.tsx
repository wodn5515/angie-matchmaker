import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listFriendInvitations } from "@/lib/db/friend-invitations";
import { listFriends } from "@/lib/db/friends";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { CreateInviteForm } from "./create-form";
import { InviteRow } from "./invite-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "친구 등록 링크 — matchmaker" };

export default async function FriendInvitesPage() {
  const session = await requireOperator();
  const [invitations, friends] = await Promise.all([
    listFriendInvitations(session.userId),
    listFriends(session.userId),
  ]);

  const friendNameById = new Map(friends.map((f) => [f.id, f.name] as const));
  const pending = invitations.filter((i) => i.status === "pending");
  const used = invitations.filter((i) => i.status === "used");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          <Link href="/friends" className="hover:text-fg">
            친구
          </Link>
          <span className="mx-1">/</span> 자가 등록 링크
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          친구가 직접 등록할 수 있는 링크
        </h1>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          친구한테 링크를 보내면 본인이 직접 프로필을 채우고 등록까지 끝냅니다.
          1회용이라 등록되면 자동 만료돼요.
        </p>
      </div>

      <CreateInviteForm appUrl={appUrl} />

      <Card>
        <CardHeader>
          <CardTitle>대기 중 ({pending.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {pending.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="대기 중인 등록 링크가 없어요"
                description="위에서 새로 만들어보세요."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {pending.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invitation={inv}
                  appUrl={appUrl}
                  variant="pending"
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {used.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록 완료 ({used.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {used.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invitation={inv}
                  appUrl={appUrl}
                  variant="used"
                  friendName={
                    inv.friend_id
                      ? (friendNameById.get(inv.friend_id) ?? null)
                      : null
                  }
                />
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
