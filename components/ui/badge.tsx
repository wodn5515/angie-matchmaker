import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "neutral"
  | "pink"
  | "success"
  | "warn"
  | "danger"
  | "outline";

const variants: Record<Variant, string> = {
  neutral:
    "bg-[var(--color-surface-2)] text-fg border border-[var(--color-border)]",
  pink: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
  success:
    "bg-[var(--color-success)]/12 text-[var(--color-success)] border border-[var(--color-success)]/30",
  warn: "bg-[var(--color-warn)]/12 text-[var(--color-warn)] border border-[var(--color-warn)]/30",
  danger:
    "bg-[var(--color-danger)]/12 text-[var(--color-danger)] border border-[var(--color-danger)]/30",
  outline:
    "bg-transparent text-[var(--color-fg-muted)] border border-[var(--color-border)]",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
