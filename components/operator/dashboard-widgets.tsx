import * as React from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDateTime } from "@/lib/utils";

/**
 * V2 운영자 대시보드 위젯 3개.
 * PRD §3.6 + §6.4 — ⏳ 심사 대기 / 📊 가입자 현황 / 빠른 진입.
 *
 * 디자이너 골격: dumb 컴포넌트 (props 로 데이터 받음). worker 가 page.tsx 에서 fetch + 주입.
 * 데이터 모델 변경 (task-A) 이전엔 worker 가 V1 데이터를 임시 매핑해도 OK.
 */

export type PendingReviewItem = {
  id: string;
  name: string;
  created_at: string;
  recommender_name: string;
  recommender_relation: string;
  match_interest: string | null;
};

export function PendingReviewWidget({
  items,
  totalPending,
}: {
  items: PendingReviewItem[];
  totalPending: number;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>⏳ 심사 대기 ({totalPending})</CardTitle>
        <Link
          href="/friends?status=pending"
          className="text-xs text-pink-400 hover:text-pink-300"
        >
          모두 보기 →
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
            새로 심사할 가입자가 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {items.slice(0, 5).map((p) => (
              <li key={p.id} className="px-5 py-3">
                <Link
                  href={`/friends/${p.id}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)] truncate">
                      추천: {p.recommender_name} ({p.recommender_relation})
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-fg-subtle)]">
                      {formatDateTime(p.created_at)}
                    </p>
                  </div>
                  {p.match_interest === "high" ? (
                    <Badge variant="pink">매칭 적극</Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export type UserStats = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  matchInterestHigh: number;
  surveyDone: number;
  surveyTotal: number;
};

export function UserStatsWidget({ stats }: { stats: UserStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 가입자 현황</CardTitle>
      </CardHeader>
      <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBlock label="총 가입자" value={stats.total} />
        <StatBlock label="승인됨" value={stats.approved} tone="success" />
        <StatBlock label="대기" value={stats.pending} tone="warn" />
        <StatBlock label="거절" value={stats.rejected} tone="danger" />
        <StatBlock
          label="매칭 적극"
          value={stats.matchInterestHigh}
          tone="pink"
        />
        <StatBlock
          label="성향 응답"
          value={`${stats.surveyDone}/${stats.surveyTotal}`}
        />
      </CardBody>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "pink" | "success" | "warn" | "danger";
}) {
  const toneClass =
    tone === "pink"
      ? "text-pink-400"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : tone === "warn"
          ? "text-[var(--color-warn)]"
          : tone === "danger"
            ? "text-[var(--color-danger)]"
            : "text-fg";
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function QuickJumpWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>빠른 진입</CardTitle>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <QuickLink href="/friends" icon="👥" title="가입자 리스트" />
        <QuickLink href="/compare" icon="⚖️" title="비교 뷰" />
        <QuickLink href="/surveys/standard" icon="📋" title="설문 편집" />
      </CardBody>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-3 py-3 text-sm text-fg transition hover:border-pink-500/40 hover:bg-[var(--color-surface-2)]"
    >
      <span className="text-lg">{icon}</span>
      <span>{title}</span>
    </Link>
  );
}

/**
 * 위젯 셋이 모두 비어있을 때 (가입자 0명) 의 empty state.
 */
export function DashboardEmpty() {
  return (
    <EmptyState
      icon={<span className="text-2xl">💌</span>}
      title="아직 가입자가 없어요"
      description="가입 페이지 링크(/signup) 를 지인에게 공유해보세요. Google 로그인으로 누구나 가입할 수 있어요."
    />
  );
}
