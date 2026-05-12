import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 가입자(self-signup user) 측 페이지 wrapper — 부드러운 핑크 그라데이션 다크 톤.
 *
 * - `/signup`, `/onboarding/*`, `/me/*`, `/pending`, `/rejected` 모든 페이지에서 사용
 * - 모바일 우선 (max-w-md), 데스크톱은 그대로 중앙 정렬
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
