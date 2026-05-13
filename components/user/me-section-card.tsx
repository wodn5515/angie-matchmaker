import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * `/me` 대시보드의 분기 카드.
 * PRD §6.3 — "내 프로필 / 이런 분이면 좋겠어요 / 연애성향 테스트" 세 카드.
 *
 * - 입력 완료도/상태를 뱃지로 보여줌
 * - 미입력 카드는 핑크 강조 + "작성 안 하면 매칭 확률이 낮아져요" 안내
 */
export function MeSectionCard({
  href,
  icon,
  title,
  description,
  statusLabel,
  statusTone = "neutral",
  highlight,
  warningText,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  statusLabel: string;
  statusTone?: "neutral" | "pink" | "success" | "warn" | "danger" | "outline";
  highlight?: boolean;
  warningText?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border transition",
        highlight
          ? "border-pink-500/40 bg-pink-500/[0.06] hover:border-pink-500/60 hover:bg-pink-500/[0.1]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-pink-500/30 hover:bg-[var(--color-surface-2)]",
      )}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl text-xl",
                highlight
                  ? "bg-pink-500/20 text-pink-300"
                  : "bg-[var(--color-surface-2)]",
              )}
            >
              {icon}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-fg">{title}</h3>
              <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                {description}
              </p>
            </div>
          </div>
          <Badge variant={statusTone}>{statusLabel}</Badge>
        </div>
        {warningText ? (
          <p className="mt-3 rounded-lg bg-[var(--color-warn)]/10 px-3 py-1.5 text-[11px] text-[var(--color-warn)]">
            ⚠ {warningText}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
