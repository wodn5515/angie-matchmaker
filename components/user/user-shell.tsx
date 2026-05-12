import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 가입자(self-signup user) 측 페이지 wrapper.
 * V1 `.friend-shell` 의 후속 — 부드러운 핑크 그라데이션 다크 톤.
 *
 * - `/signup`, `/onboarding/*`, `/me/*`, `/pending`, `/rejected` 모든 페이지에서 사용
 * - 모바일 우선 (max-w-md), 데스크톱은 그대로 중앙 정렬
 * - V1 의 친구-shell 톤을 계승하되 클래스 이름만 v2 의미에 맞춰 `user-shell` 로 분리
 *   (rename 의도: PRD V2 가 "친구" 의미를 "가입자" 로 잘랐다는 결정 — D-004)
 */
export function UserShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("user-shell min-h-screen w-full", className)}>
      <main className="mx-auto w-full max-w-md px-5 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
