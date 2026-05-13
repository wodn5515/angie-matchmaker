"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * V2 연애 성향 테스트 하위 탭. V1 의 "발송" / "이력" 탭은 폐기 (decisions/004 — 토큰 흐름 사라짐).
 * 템플릿 (표준 + 커스텀) 만 남는다.
 */
const TABS = [
  {
    href: "/surveys",
    label: "템플릿",
    match: (p: string) =>
      p === "/surveys" ||
      p.startsWith("/surveys/standard") ||
      p.startsWith("/surveys/custom"),
  },
];

export function SurveysTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="연애 성향 테스트 하위 메뉴"
      className="border-b border-[var(--color-border)] -mx-4 px-4 mb-2"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "inline-flex items-center px-4 py-3 text-sm whitespace-nowrap border-b-2 transition -mb-px",
                  active
                    ? "border-pink-500 text-fg font-semibold"
                    : "border-transparent text-[var(--color-fg-muted)] hover:text-fg",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
