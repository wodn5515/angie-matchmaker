"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SurveyChapter, SurveyQuestion } from "@/lib/types/domain";
import { saveMeAnswerAction, finishSurveyAction } from "../actions";

/**
 * V2 가입자 측 챕터 runner — `/me/survey/[chapter]` 에서 한 챕터를 풀기 위한 client.
 *
 * V1 의 `/s/[token]/[chapter]` 의 자동저장 UX 를 OAuth 진입으로 이식.
 * 차이:
 *   - token 대신 세션 기반 (server action 안에서 friendId 결정)
 *   - 마지막 챕터 완료 시 `finishSurveyAction()` 호출 → 온보딩 중이면 /me (심사 대기
 *     배너 노출, 013 §D1), 이미 승인된 가입자면 /me 로 이동
 *   - "제출" 개념 없음 — 자동 저장만, 단순히 "마지막 챕터까지 완료" 시 redirect
 */
type Props = {
  chapterIndex: number;
  totalChapters: number;
  chapter: SurveyChapter;
  nextChapterId: string | null;
  questions: SurveyQuestion[];
  initialAnswers: Record<string, unknown>;
  friendName: string;
};

export function ChapterRunner({
  chapterIndex,
  totalChapters,
  chapter,
  nextChapterId,
  questions,
  initialAnswers,
  friendName,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [busy, startBusy] = useTransition();

  const requiredMissing = useMemo(() => {
    return questions.some((q) => {
      if (!q.required) return false;
      const v = answers[q.id];
      return v == null || v === "" || (Array.isArray(v) && v.length === 0);
    });
  }, [questions, answers]);

  const filledCount = questions.filter((q) => {
    const v = answers[q.id];
    return !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
  }).length;

  const isLastChapter = nextChapterId == null;

  const saveAnswer = async (questionId: string, value: unknown) => {
    const res = await saveMeAnswerAction({ questionId, value });
    if (res.ok) setSavedAt(Date.now());
  };

  const debouncers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingText = useRef<Map<string, unknown>>(new Map());

  const setAnswer = (q: SurveyQuestion, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    if (q.type === "text") {
      pendingText.current.set(q.id, value);
      const existing = debouncers.current.get(q.id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveAnswer(q.id, value);
        debouncers.current.delete(q.id);
        pendingText.current.delete(q.id);
      }, 1500);
      debouncers.current.set(q.id, timer);
    } else {
      saveAnswer(q.id, value);
    }
  };

  const flushPendingTextSaves = async () => {
    const tasks: Promise<unknown>[] = [];
    for (const [qid, value] of pendingText.current.entries()) {
      const timer = debouncers.current.get(qid);
      if (timer) clearTimeout(timer);
      tasks.push(saveAnswer(qid, value));
    }
    pendingText.current.clear();
    debouncers.current.clear();
    if (tasks.length > 0) await Promise.all(tasks);
  };

  useEffect(() => {
    const dmap = debouncers.current;
    return () => {
      for (const t of dmap.values()) clearTimeout(t);
      dmap.clear();
    };
  }, []);

  const onNext = () => {
    if (requiredMissing) return;
    if (chapter.result_template) {
      setShowResult(true);
    } else {
      goNext();
    }
  };

  const goNext = () => {
    startBusy(async () => {
      await flushPendingTextSaves();
      if (isLastChapter) {
        const res = await finishSurveyAction();
        router.replace(res.nextHref);
        return;
      }
      router.push(`/me/survey/${nextChapterId}`);
    });
  };

  if (showResult && chapter.result_template) {
    return (
      <ChapterResult
        index={chapterIndex}
        total={totalChapters}
        title={chapter.title}
        body={chapter.result_template}
        onContinue={goNext}
        isLast={isLastChapter}
        submitting={busy}
      />
    );
  }

  return (
    <>
      <ProgressHeader
        index={chapterIndex}
        total={totalChapters}
        savedAt={savedAt}
        chapterTitle={chapter.title}
      />

      <div className="mt-6 space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-pink-400">
          챕터 {chapterIndex + 1} / {totalChapters}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{chapter.title}</h1>
        {chapter.description ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            {chapter.description}
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q, v)}
          />
        ))}
      </div>

      <div className="mt-8">
        <Button
          size="lg"
          className="w-full"
          onClick={onNext}
          disabled={requiredMissing || busy}
        >
          {requiredMissing
            ? "필수 항목을 채워줘"
            : isLastChapter
              ? busy
                ? "마무리 중…"
                : "🎉 모두 완료"
              : `${filledCount}/${questions.length} — 다음 챕터로 →`}
        </Button>
      </div>

      <p className="mt-4 text-center text-[11px] text-[var(--color-fg-subtle)]">
        답하면서 자동 저장돼. {friendName}, 천천히 답해도 괜찮아 💞
      </p>
    </>
  );
}

function ProgressHeader({
  index,
  total,
  savedAt,
  chapterTitle,
}: {
  index: number;
  total: number;
  savedAt: number | null;
  chapterTitle: string;
}) {
  const pct = Math.round(((index + 1) / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-fg-muted)]">
          {chapterTitle}
        </span>
        <SavedBadge savedAt={savedAt} />
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SavedBadge({ savedAt }: { savedAt: number | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (savedAt == null) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, [savedAt]);
  return (
    <span
      className={cn(
        "text-[11px] transition-opacity",
        show
          ? "opacity-100 text-[var(--color-success)]"
          : "opacity-50 text-[var(--color-fg-muted)]",
      )}
    >
      {savedAt ? (show ? "저장됨 ✓" : "자동 저장 중") : "자동 저장됨"}
    </span>
  );
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[11px] font-semibold text-pink-300">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base text-fg">
            {question.prompt}
            {question.required ? (
              <span className="ml-1 text-pink-400">*</span>
            ) : null}
          </p>
          <div className="mt-3">
            <QuestionInput question={question} value={value} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (question.type === "mcq_single") {
    const opts = (question.options as string[] | null) ?? [];
    return (
      <div className="grid gap-2">
        {opts.map((o, i) => {
          const selected = value === o;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-sm transition",
                selected
                  ? "border-pink-500 bg-pink-500/15 text-pink-100"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-pink-500/50",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === "mcq_multi") {
    const opts = (question.options as string[] | null) ?? [];
    const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
    return (
      <div className="grid gap-2">
        {opts.map((o, i) => {
          const isOn = selected.has(o);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = new Set(selected);
                if (isOn) next.delete(o);
                else next.add(o);
                onChange(Array.from(next));
              }}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition",
                isOn
                  ? "border-pink-500 bg-pink-500/15 text-pink-100"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-pink-500/50",
              )}
            >
              <span>{o}</span>
              {isOn ? <span className="text-pink-300">✓</span> : null}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === "likert") {
    const opts = (question.options as
      | { min: number; max: number; minLabel?: string; maxLabel?: string }
      | null) ?? { min: 1, max: 5 };
    const items: number[] = [];
    for (let i = opts.min; i <= opts.max; i++) items.push(i);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-[var(--color-fg-muted)]">
          <span>{opts.minLabel ?? `${opts.min}`}</span>
          <span>{opts.maxLabel ?? `${opts.max}`}</span>
        </div>
        <div className="flex gap-1.5">
          {items.map((n) => {
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-sm font-semibold transition",
                  selected
                    ? "border-pink-500 bg-pink-500 text-white"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-fg hover:border-pink-500/50",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "ranking") {
    const opts = (question.options as string[] | null) ?? [];
    const order =
      Array.isArray(value) && (value as string[]).length === opts.length
        ? (value as string[])
        : opts;
    return <RankingInput order={order} setOrder={onChange} />;
  }
  if (question.type === "text") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-fg placeholder:text-[var(--color-fg-subtle)] focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
        placeholder="자유롭게 적어줘"
      />
    );
  }
  return null;
}

function RankingInput({
  order,
  setOrder,
}: {
  order: string[];
  setOrder: (next: string[]) => void;
}) {
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    setOrder(next);
  };
  return (
    <ol className="space-y-1.5">
      {order.map((item, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-[11px] font-semibold text-pink-300">
            {i + 1}
          </span>
          <span className="flex-1 text-sm text-fg">{item}</span>
          <button
            type="button"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            aria-label="위로"
            className="text-[var(--color-fg-muted)] hover:text-pink-300 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => move(i, 1)}
            disabled={i === order.length - 1}
            aria-label="아래로"
            className="text-[var(--color-fg-muted)] hover:text-pink-300 disabled:opacity-30"
          >
            ▼
          </button>
        </li>
      ))}
    </ol>
  );
}

function ChapterResult({
  index,
  total,
  title,
  body,
  onContinue,
  isLast,
  submitting,
}: {
  index: number;
  total: number;
  title: string;
  body: string;
  onContinue: () => void;
  isLast: boolean;
  submitting: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-5xl">🎉</div>
      <p className="mt-3 text-[11px] uppercase tracking-wide text-pink-400">
        챕터 {index + 1} / {total} 클리어!
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 px-5 py-6 text-sm text-fg whitespace-pre-wrap text-left">
        {body}
      </div>
      <div className="mt-6">
        <Button
          size="lg"
          className="w-full"
          onClick={onContinue}
          disabled={submitting}
        >
          {isLast
            ? submitting
              ? "마무리 중…"
              : "🎉 완료"
            : "다음 챕터로 →"}
        </Button>
      </div>
    </div>
  );
}
