import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/input";

/**
 * Label + 입력 + hint/error 묶음. 폼 boilerplate 감소.
 * 가입자 측 온보딩 폼은 필드가 많아 (PRD 9개 권장 + 이상형 8개) 묶어두는 게 편하다.
 *
 * 사용 예:
 *   <Field label="이름" htmlFor="name" required hint="별명도 OK">
 *     <Input id="name" name="name" />
 *   </Field>
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11px] text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * 폼 섹션 wrapper — 가입자 측 페이지에서 자주 쓰임.
 * (V1 의 `app/r/[token]/registration-form.tsx` 내부 Section 을 공용 위치로 옮김)
 */
export function FormSection({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-sm px-4 py-4",
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
