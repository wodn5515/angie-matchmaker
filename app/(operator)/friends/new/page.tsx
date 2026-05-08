import { requireOperator } from "@/lib/auth/operator";
import { FriendForm } from "@/components/operator/friend-form";
import { createFriendAction } from "../actions";

export const metadata = { title: "친구 등록 — matchmaker" };

export default async function NewFriendPage() {
  await requireOperator();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">친구 등록</p>
        <h1 className="text-2xl font-semibold tracking-tight">새 친구 카드</h1>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          이름, 성별, 선호 성별만 입력해도 등록됩니다. 나머지는 나중에 채워도 됩니다.
        </p>
      </div>
      <FriendForm action={createFriendAction} submitLabel="등록" />
    </div>
  );
}
