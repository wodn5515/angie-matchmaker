"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "대시보드" },
  { href: "/friends", label: "친구" },
  { href: "/surveys", label: "설문" },
  { href: "/send", label: "발송" },
  { href: "/invitations", label: "발송 이력" },
  { href: "/matches", label: "매칭 이력" },
];

export function OperatorNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition",
              isActive(l.href)
                ? "bg-pink-500/15 text-pink-300"
                : "text-[var(--color-fg-muted)] hover:text-fg hover:bg-[var(--color-surface)]",
            )}
          >
            {l.label}
          </Link>
        ))}
        <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
        <Link
          href="/settings"
          className="text-xs text-[var(--color-fg-muted)] hover:text-fg px-2"
        >
          {displayName}
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-xs text-[var(--color-fg-subtle)] hover:text-fg px-2"
          >
            로그아웃
          </button>
        </form>
      </nav>
      <button
        type="button"
        aria-label="메뉴"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-fg"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      {open ? (
        <div className="md:hidden absolute left-0 right-0 top-full mt-px border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition",
                  isActive(l.href)
                    ? "bg-pink-500/15 text-pink-300"
                    : "text-[var(--color-fg-muted)] hover:text-fg hover:bg-[var(--color-surface)]",
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="my-1 border-t border-[var(--color-border)]" />
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:text-fg"
            >
              {displayName} · 설정
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm text-[var(--color-fg-subtle)] hover:text-fg w-full text-left"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
