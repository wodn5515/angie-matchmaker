"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteFriendAction } from "../actions";

export function DeleteFriendButton({
  friendId,
  friendName,
}: {
  friendId: string;
  friendName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        삭제
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-fg-muted)]">
        {friendName} 삭제할까요?
      </span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteFriendAction(friendId);
          })
        }
      >
        {pending ? "삭제 중…" : "삭제"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        취소
      </Button>
    </div>
  );
}
