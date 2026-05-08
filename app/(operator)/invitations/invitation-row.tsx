"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Survey, SurveyInvitation } from "@/lib/types/domain";
import { deleteInvitationAction } from "./actions";

type Variant = "pending" | "completed";

export function InvitationRow({
  invitation,
  friendName,
  survey,
  appUrl,
  variant,
}: {
  invitation: SurveyInvitation;
  friendName: string;
  survey: Survey | null;
  appUrl: string;
  variant: Variant;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const link = appUrl ? `${appUrl}/s/${invitation.token}` : null;
  const surveyLabel = survey
    ? `${survey.type === "standard" ? "[표준]" : "[커스텀]"} ${survey.title}`
    : "(삭제된 설문)";

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
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const onShare = async () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "설문",
          text: `${friendName}, 설문에 답해줄래? 🎀`,
          url: link,
        });
      } catch {
        // user canceled
      }
    } else {
      onCopy();
    }
  };

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteInvitationAction({
        invitationId: invitation.id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // page revalidates server-side
    });
  };

  return (
    <li className="px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm text-fg">{friendName}</p>
            <StatusBadge variant={variant} status={invitation.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)] truncate">
            {surveyLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">
            발송 {formatDateTime(invitation.created_at)}
            {invitation.completed_at
              ? ` · 완료 ${formatDateTime(invitation.completed_at)}`
              : ""}
          </p>
          {error ? (
            <p className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          {variant === "pending" && link ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCopy}
                disabled={pending}
              >
                {linkCopied ? "복사됨 ✓" : "📋 링크"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onShare}
                disabled={pending}
              >
                공유
              </Button>
            </>
          ) : null}
          {confirming ? (
            <>
              <span className="text-[11px] text-[var(--color-fg-muted)]">
                {variant === "pending"
                  ? "취소할까요?"
                  : "응답까지 함께 삭제됩니다."}
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
              {variant === "pending" ? "취소" : "삭제"}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  variant,
  status,
}: {
  variant: Variant;
  status: SurveyInvitation["status"];
}) {
  if (variant === "completed") return <Badge variant="success">완료</Badge>;
  if (status === "in_progress") return <Badge variant="warn">응답 중</Badge>;
  return <Badge variant="outline">미응답</Badge>;
}
