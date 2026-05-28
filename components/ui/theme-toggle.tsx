"use client";

import { cn } from "@/lib/utils";

/**
 * 라이트/다크 테마 토글 버튼.
 *
 * 동작은 전적으로 DOM + 쿠키로만 처리한다 (React state 없음):
 *   - `html.dark` 클래스를 토글하고 같은 값을 `theme` 쿠키에 1년 저장
 *   - 다음 요청부터는 루트 레이아웃(app/layout.tsx)이 쿠키를 읽어 SSR 단계에서
 *     `dark` 클래스를 미리 박으므로 FOUC(테마 깜빡임)가 없다
 *
 * 아이콘 전환도 React state가 아니라 `.dark` 셀렉터 기반 CSS로 처리한다
 * (globals.css 의 `.theme-toggle-sun/-moon`). 덕분에 서버/클라이언트 마크업이
 * 항상 동일해 hydration mismatch가 발생하지 않는다.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="라이트/다크 테마 전환"
      title="테마 전환"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg-muted)] transition hover:text-fg hover:bg-[var(--color-surface)]",
        className,
      )}
    >
      {/* 라이트일 때 노출 (탭 → 다크로) */}
      <svg
        className="theme-toggle-moon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* 다크일 때 노출 (탭 → 라이트로) */}
      <svg
        className="theme-toggle-sun"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
