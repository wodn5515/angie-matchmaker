import * as React from "react";
import { TabBar } from "@/components/ui/tab-bar";
import type { TabBarItem } from "@/components/ui/tab-bar";

/**
 * `/friends` 페이지 상단의 status sub-tab.
 * PRD §3.2 — 전체 / 심사 대기 / 승인됨 / 거절됨.
 *
 * worker 는 page.tsx 에서 status 별 count 와 활성 status (searchParams) 를 props 로 넘김.
 * query string `?status=pending` 형태로 라우팅.
 */
export type FriendsStatusCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function FriendsStatusTabs({
  active,
  counts,
}: {
  active: "all" | "pending" | "approved" | "rejected";
  counts: FriendsStatusCounts;
}) {
  const items: TabBarItem[] = [
    { key: "all", label: "전체", href: "/friends", count: counts.all },
    {
      key: "pending",
      label: "심사 대기",
      href: "/friends?status=pending",
      count: counts.pending,
      tone: "warn",
    },
    {
      key: "approved",
      label: "승인됨",
      href: "/friends?status=approved",
      count: counts.approved,
      tone: "success",
    },
    {
      key: "rejected",
      label: "거절됨",
      href: "/friends?status=rejected",
      count: counts.rejected,
      tone: "danger",
    },
  ];

  return <TabBar items={items} activeKey={active} />;
}
