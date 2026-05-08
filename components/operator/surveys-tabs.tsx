"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/surveys", label: "템플릿", match: (p: string) => p === "/surveys" || p.startsWith("/surveys/standard") || p.startsWith("/surveys/custom") },
  { href: "/surveys/send", label: "발송", match: (p: string) => p === "/surveys/send" || p.startsWith("/surveys/send/") },
  { href: "/surveys/invitations", label: "이력", match: (p: string) => p === "/surveys/invitations" || p.startsWith("/surveys/invitations/") },
];

export function SurveysTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="설문 하위 메뉴"
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
