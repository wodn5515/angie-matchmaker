import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 가입자(self-signup user) 측 페이지 wrapper — 부드러운 핑크 그라데이션 다크 톤.
 *
 * - `/onboarding/*`, `/me/*`, `/rejected` 가입자 측 페이지에서 사용
 *   (010-v2-unified-login 후 `/login` 은 운영자 톤 유지 + 가입자도 같은 톤으로 진입)
 *   (013 §D1·D2 후 `/pending` 폐기 — pending 가입자도 `/me` 본거지로 흡수)
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
