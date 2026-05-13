"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 운영자 측 sub-tab (예: /friends 페이지의 전체/심사 대기/승인됨/거절됨).
 * 라우터 query 기반 — 각 탭이 동일 페이지에 query 만 다르게 link.
 *
 * 가시·접근 단순화: 횡 스크롤(scrollbar-thin) + count 뱃지 표시.
 */
export type TabBarItem = {
  key: string;
  label: string;
  href: string;
  count?: number;
  tone?: "neutral" | "pink" | "warn" | "success" | "danger";
};

export function TabBar({
  items,
  activeKey,
  className,
}: {
  items: TabBarItem[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-thin -mx-1 flex items-center gap-1 overflow-x-auto px-1",
        className,
      )}
      role="tablist"
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <Link
            key={it.key}
            href={it.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition",
              active
                ? "bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/30"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface)] hover:text-fg",
            )}
          >
            <span>{it.label}</span>
            {typeof it.count === "number" ? (
              <span
                className={cn(
                  "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1.5 text-[10px]",
                  active
                    ? "bg-pink-500/30 text-pink-200"
                    : "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]",
                )}
              >
                {it.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
