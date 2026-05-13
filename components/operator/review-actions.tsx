"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * 가입자 상세(`/friends/[id]`) 페이지의 심사 액션 패널.
 * PRD §3.2 — 인라인 빠른 승인 X, 반드시 상세 페이지 거치게.
 *
 * UI 만 제공 — 실제 승인/거절 server action 은 worker 가 props.action 으로 주입.
 * Server Component → Client Component 함수 prop 금지 규약 (CLAUDE.md §8) 에 맞춰
 * action 은 반드시 `"use server"` Server Action 만 받는다.
 */
export function ReviewActions({
  status,
  approveAction,
  rejectAction,
  initialRejectedReason,
}: {
  status: "pending" | "approved" | "rejected";
  /** Server Action — `(formData: FormData) => Promise<void>` */
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  initialRejectedReason?: string;
}) {
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState(initialRejectedReason ?? "");

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">심사</h3>
        <Badge
          variant={
            status === "approved"
              ? "success"
              : status === "rejected"
                ? "danger"
                : "warn"
          }
        >
          {status === "approved"
            ? "승인됨"
            : status === "rejected"
              ? "거절됨"
              : "심사 대기"}
        </Badge>
      </div>

      {status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <Button type="submit" variant="primary">
              ✓ 승인
            </Button>
          </form>
          <Button
            type="button"
            variant="danger"
            onClick={() => setRejectOpen((v) => !v)}
          >
            ✗ 거절
          </Button>
        </div>
      ) : null}

      {status === "approved" ? (
        <p className="text-[11px] text-[var(--color-fg-muted)]">
          이 가입자는 매칭 풀에 있어요. 거절로 되돌리려면 운영자 권한으로 DB
          수정이 필요해요.
        </p>
      ) : null}

      {status === "rejected" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--color-fg-muted)]">
            거절 사유 (가입자에게 비공개):
          </p>
          <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-fg">
            {initialRejectedReason || "(메모 없음)"}
          </p>
        </div>
      ) : null}

      {status === "pending" && rejectOpen ? (
        <form action={rejectAction} className="space-y-2">
          <label
            htmlFor="rejected_reason"
            className="text-[11px] text-[var(--color-fg-muted)]"
          >
            거절 사유 (가입자에게 비공개 — 운영자 본인 회고용)
          </label>
          <Textarea
            id="rejected_reason"
            name="rejected_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 추천인이 운영자가 모르는 사람"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRejectOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" variant="danger">
              거절 확정
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
