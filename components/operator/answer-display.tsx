import type { SurveyQuestion } from "@/lib/types/domain";

/**
 * Render a single answer value in a type-aware way. Used both in the
 * comparison view and in the friend detail page's invitation history.
 */
export function AnswerView({
  question,
  value,
  emptyLabel = "미응답",
}: {
  question: SurveyQuestion;
  value: unknown;
  emptyLabel?: string;
}) {
  if (value == null || value === "") {
    return <span className="text-[var(--color-fg-subtle)]">{emptyLabel}</span>;
  }
  if (question.type === "likert") {
    const opts = question.options as
      | { min: number; max: number; minLabel?: string; maxLabel?: string }
      | null;
    const max = opts?.max ?? 5;
    const min = opts?.min ?? 1;
    const span = Math.max(1, max - min);
    const pct = ((Number(value) - min) / span) * 100;
    return (
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-pink-400 font-semibold">{String(value)}</span>
          {opts ? (
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              / {max}
            </span>
          ) : null}
        </div>
        <div className="h-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
          <div
            className="h-full bg-pink-500"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        {opts?.minLabel || opts?.maxLabel ? (
          <div className="flex justify-between text-[10px] text-[var(--color-fg-subtle)]">
            <span>{opts?.minLabel ?? ""}</span>
            <span>{opts?.maxLabel ?? ""}</span>
          </div>
        ) : null}
      </div>
    );
  }
  if (question.type === "ranking" && Array.isArray(value)) {
    return (
      <ol className="list-decimal pl-5 space-y-0.5">
        {(value as string[]).map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ol>
    );
  }
  if (question.type === "mcq_multi" && Array.isArray(value)) {
    return (
      <ul className="flex flex-wrap gap-1">
        {(value as string[]).map((v, i) => (
          <li
            key={i}
            className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px]"
          >
            {v}
          </li>
        ))}
      </ul>
    );
  }
  if (question.type === "text" && typeof value === "string") {
    return <p className="whitespace-pre-wrap text-[13px]">{value}</p>;
  }
  return <span>{String(value)}</span>;
}
