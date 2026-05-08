import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
import { getFriend } from "@/lib/db/friends";
import { FriendForm } from "@/components/operator/friend-form";
import { updateFriendAction } from "../../actions";

export const metadata = { title: "친구 수정 — matchmaker" };

export default async function EditFriendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOperator();
  const friend = await getFriend(session.userId, id);
  if (!friend) notFound();

  const action = updateFriendAction.bind(null, friend.id);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">친구 / 수정</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {friend.name} 수정
        </h1>
      </div>
      <FriendForm
        initial={friend}
        action={action}
        submitLabel="저장"
        redirectAfter={(fid) => `/friends/${fid}`}
      />
    </div>
  );
}
