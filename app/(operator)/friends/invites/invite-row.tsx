"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { FriendInvitation } from "@/lib/db/friend-invitations";
import { deleteFriendInvitationAction } from "./actions";

type Variant = "pending" | "used";

export function InviteRow({
  invitation,
  appUrl,
  variant,
  friendName,
}: {
  invitation: FriendInvitation;
  appUrl: string;
  variant: Variant;
  friendName?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = appUrl ? `${appUrl}/r/${invitation.token}` : null;

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteFriendInvitationAction({
        invitationId: invitation.id,
      });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li className="px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {variant === "used" ? (
              <Badge variant="success">등록됨</Badge>
            ) : (
              <Badge variant="outline">대기중</Badge>
            )}
            <p className="truncate text-sm text-fg">
              {variant === "used" && friendName ? (
                <Link
                  href={`/friends/${invitation.friend_id}`}
                  className="hover:text-pink-300 underline-offset-2 hover:underline"
                >
                  {friendName}
                </Link>
              ) : invitation.hint_name ? (
                <span>{invitation.hint_name}</span>
              ) : (
                <span className="text-[var(--color-fg-muted)]">
                  (이름 미설정)
                </span>
              )}
            </p>
          </div>
          {invitation.hint_note ? (
            <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)] truncate">
              {invitation.hint_note}
            </p>
          ) : null}
          <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">
            발급 {formatDateTime(invitation.created_at)}
            {invitation.used_at
              ? ` · 등록 ${formatDateTime(invitation.used_at)}`
              : ""}
          </p>
          {error ? (
            <p className="mt-1 text-[11px] text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          {variant === "pending" && link && !confirming ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onCopy}
              disabled={pending}
            >
              {copied ? "복사됨 ✓" : "📋 링크"}
            </Button>
          ) : null}
          {confirming ? (
            <>
              <span className="text-[11px] text-[var(--color-fg-muted)]">
                {variant === "pending" ? "취소할까요?" : "기록을 삭제할까요?"}
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={onDelete}
                disabled={pending}
              >
                {pending
                  ? "처리 중…"
                  : variant === "pending"
                    ? "취소"
                    : "삭제"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                중단
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant={variant === "pending" ? "ghost" : "outline"}
              onClick={() => setConfirming(true)}
              disabled={pending}
            >
              {variant === "pending" ? "취소" : "기록 삭제"}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
