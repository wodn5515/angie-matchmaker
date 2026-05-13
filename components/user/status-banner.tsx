import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 가입자 status (pending/approved/rejected) 안내 배너.
 * `/me` 상단·`/pending`·`/rejected` 페이지에서 사용.
 */
export function StatusBanner({
  tone,
  icon,
  title,
  description,
  className,
}: {
  tone: "pending" | "approved" | "rejected";
  icon: string;
  title: string;
  description?: string;
  className?: string;
}) {
  const toneClass = {
    pending: "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]",
    approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    rejected: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 backdrop-blur-sm",
        toneClass,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none">{icon}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p className="text-[12px] leading-relaxed opacity-90">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
