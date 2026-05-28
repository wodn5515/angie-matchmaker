import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-pink-500 text-white hover:bg-pink-400 active:bg-pink-600",
        secondary:
          "bg-[var(--color-surface-2)] text-fg hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
        outline:
          "border border-[var(--color-border-strong)] text-fg hover:bg-[var(--color-surface)]",
        ghost: "text-fg hover:bg-[var(--color-surface)]",
        danger:
          "bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25",
        link: "text-pink-400 hover:text-pink-300 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
