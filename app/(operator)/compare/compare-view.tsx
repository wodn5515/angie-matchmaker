"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import {
  PAIR_OUTCOME_LABEL,
  type Friend,
  type Pair,
  type SurveyAnswer,
  type SurveyChapter,
  type SurveyQuestion,
} from "@/lib/types/domain";
import { upsertPairAction } from "./actions";
import { formatDateTime } from "@/lib/utils";
import { AnswerView } from "@/components/operator/answer-display";

type Props = {
  friendA: Friend;
  friendB: Friend;
  chapters: SurveyChapter[];
  questions: SurveyQuestion[];
  answersA: SurveyAnswer[];
  answersB: SurveyAnswer[];
  pair: Pair;
};

export function CompareView({
  friendA,
  friendB,
  chapters,
  questions,
  answersA,
  answersB,
  pair,
}: Props) {
  const ansAByQ = useMemo(
    () => new Map(answersA.map((a) => [a.question_id, a.value] as const)),
    [answersA],
  );
  const ansBByQ = useMemo(
    () => new Map(answersB.map((a) => [a.question_id, a.value] as const)),
    [answersB],
  );
  const questionsByChapter = useMemo(() => {
    const m = new Map<string, SurveyQuestion[]>();
    for (const q of questions) {
      const arr = m.get(q.chapter_id) ?? [];
      arr.push(q);
      m.set(q.chapter_id, arr);
    }
    return m;
  }, [questions]);

  const totalQuestions = questions.length;
  const answeredBoth = questions.filter((q) => {
    const va = ansAByQ.get(q.id);
    const vb = ansBByQ.get(q.id);
    const has = (v: unknown) =>
      v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
    return has(va) && has(vb);
  }).length;

  const [surveyOpen, setSurveyOpen] = useState(true);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={() => setSurveyOpen((v) => !v)}
          aria-expanded={surveyOpen}
          className="w-full px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 text-left hover:bg-[var(--color-surface-2)]/30 transition"
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">
              표준 설문 답변 비교
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
              {totalQuestions === 0
                ? "표준 설문이 비어 있어요"
                : `둘 다 응답한 문항 ${answeredBoth}/${totalQuestions}`}
            </p>
          </div>
          <span
            aria-hidden
            className={
              "text-[var(--color-fg-muted)] transition-transform " +
              (surveyOpen ? "rotate-180" : "")
            }
          >
            ▾
          </span>
        </button>
        {surveyOpen ? (
          <CardBody className="space-y-5">
            {chapters.length === 0 ? (
              <p className="text-xs text-[var(--color-fg-muted)]">
                표준 설문에 챕터가 없어요.
              </p>
            ) : (
              chapters.map((c, ci) => {
                const qs = questionsByChapter.get(c.id) ?? [];
                if (qs.length === 0) return null;
                return (
                  <div key={c.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="pink">챕터 {ci + 1}</Badge>
                      <h3 className="text-sm font-semibold text-fg">
                        {c.title}
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {qs.map((q) => (
                        <CompareRow
                          key={q.id}
                          question={q}
                          valueA={ansAByQ.get(q.id) ?? null}
                          valueB={ansBByQ.get(q.id) ?? null}
                          nameA={friendA.name}
                          nameB={friendB.name}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </CardBody>
        ) : null}
      </Card>

      <PairPanel friendA={friendA} friendB={friendB} pair={pair} />
    </>
  );
}

function CompareRow({
  question,
  valueA,
  valueB,
  nameA,
  nameB,
}: {
  question: SurveyQuestion;
  valueA: unknown;
  valueB: unknown;
  nameA: string;
  nameB: string;
}) {
  const sameness = compareValues(question.type, valueA, valueB);
  const colorClass =
    sameness === "same"
      ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/8"
      : sameness === "different"
        ? "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/8"
        : sameness === "partial"
          ? "border-[var(--color-warn)]/40 bg-[var(--color-warn)]/8"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]/40";

  return (
    <li
      className={
        "rounded-lg border p-3 transition " + colorClass
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-fg">{question.prompt}</p>
        <SamenessIndicator sameness={sameness} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <AnswerCell name={nameA} value={valueA} question={question} />
        <AnswerCell name={nameB} value={valueB} question={question} />
      </div>
    </li>
  );
}

function SamenessIndicator({
  sameness,
}: {
  sameness: "same" | "different" | "partial" | "missing";
}) {
  if (sameness === "missing")
    return (
      <Badge variant="outline" className="shrink-0">
        미응답
      </Badge>
    );
  if (sameness === "same")
    return (
      <span
        className="shrink-0 inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]"
        title="같은 답"
      />
    );
  if (sameness === "different")
    return (
      <span
        className="shrink-0 inline-flex h-2 w-2 rounded-full bg-[var(--color-danger)]"
        title="다른 답"
      />
    );
  return (
    <span
      className="shrink-0 inline-flex h-2 w-2 rounded-full bg-[var(--color-warn)]"
      title="일부 일치"
    />
  );
}

function AnswerCell({
  name,
  value,
  question,
}: {
  name: string;
  value: unknown;
  question: SurveyQuestion;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
        {name}
      </p>
      <div className="mt-1 text-sm text-fg">
        <AnswerView question={question} value={value} />
      </div>
    </div>
  );
}

function compareValues(
  type: SurveyQuestion["type"],
  a: unknown,
  b: unknown,
): "same" | "different" | "partial" | "missing" {
  if (a == null || a === "" || b == null || b === "") return "missing";
  if (type === "mcq_single") return a === b ? "same" : "different";
  if (type === "text") return a === b ? "same" : "different";
  if (type === "likert") {
    const da = Number(a),
      db = Number(b);
    if (Number.isNaN(da) || Number.isNaN(db)) return "missing";
    if (da === db) return "same";
    return Math.abs(da - db) <= 1 ? "partial" : "different";
  }
  if (type === "mcq_multi" && Array.isArray(a) && Array.isArray(b)) {
    const setA = new Set(a as string[]);
    const setB = new Set(b as string[]);
    const overlap = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    if (union === 0) return "missing";
    const j = overlap / union;
    if (j === 1) return "same";
    if (j === 0) return "different";
    return "partial";
  }
  if (type === "ranking" && Array.isArray(a) && Array.isArray(b)) {
    const arrA = a as string[];
    const arrB = b as string[];
    const len = Math.min(arrA.length, arrB.length);
    if (len === 0) return "missing";
    let same = 0;
    for (let i = 0; i < len; i++) if (arrA[i] === arrB[i]) same++;
    const ratio = same / len;
    if (ratio === 1) return "same";
    if (ratio === 0) return "different";
    return "partial";
  }
  return a === b ? "same" : "different";
}

// ----- Pair Panel (memo + introduce + outcome) -----

function PairPanel({
  friendA,
  friendB,
  pair,
}: {
  friendA: Friend;
  friendB: Friend;
  pair: Pair;
}) {
  const [memo, setMemo] = useState(pair.comparison_memo ?? "");
  const [outcome, setOutcome] = useState<string>(pair.outcome ?? "");
  const [outcomeMemo, setOutcomeMemo] = useState(pair.outcome_memo ?? "");
  const [introduced, setIntroduced] = useState(pair.introduced);
  const [introducedAt, setIntroducedAt] = useState<string | null>(
    pair.introduced_at,
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save for memo and outcomeMemo.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await upsertPairAction({
            friendAId: friendA.id,
            friendBId: friendB.id,
            comparisonMemo: memo,
            outcomeMemo,
          });
          setSavedAt(new Date().toISOString());
          setSaveError(null);
        } catch {
          setSaveError("저장 실패 — 잠시 후 자동으로 다시 시도합니다");
        }
      });
    }, 1500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo, outcomeMemo]);

  const onIntroducedToggle = () => {
    const prev = introduced;
    const prevAt = introducedAt;
    const next = !introduced;
    setIntroduced(next);
    setIntroducedAt(next ? new Date().toISOString() : null);
    startTransition(async () => {
      try {
        await upsertPairAction({
          friendAId: friendA.id,
          friendBId: friendB.id,
          introduced: next,
        });
        setSavedAt(new Date().toISOString());
        setSaveError(null);
      } catch {
        // Roll back optimistic UI on failure.
        setIntroduced(prev);
        setIntroducedAt(prevAt);
        setSaveError("큐피드 저장 실패");
      }
    });
  };

  const onOutcomeChange = (next: string) => {
    const prev = outcome;
    setOutcome(next);
    startTransition(async () => {
      try {
        await upsertPairAction({
          friendAId: friendA.id,
          friendBId: friendB.id,
          outcome: next === "" ? undefined : (next as "good" | "bad" | "in_progress" | "unknown"),
        });
        setSavedAt(new Date().toISOString());
        setSaveError(null);
      } catch {
        setOutcome(prev);
        setSaveError("결과 저장 실패");
      }
    });
  };

  return (
    <Card className="sticky bottom-3 z-10 pink-glow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>비교 메모 / 큐피드</CardTitle>
            <p
              className={
                "mt-0.5 text-[11px] " +
                (saveError
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-fg-muted)]")
              }
            >
              {saveError
                ? saveError
                : savedAt
                  ? `저장됨 ✓ ${formatDateTime(savedAt)}`
                  : pending
                    ? "저장 중…"
                    : "변경 시 자동 저장돼요"}
            </p>
          </div>
          <Button
            variant={introduced ? "danger" : "primary"}
            size="sm"
            onClick={onIntroducedToggle}
            disabled={pending}
          >
            {introduced ? "큐피드 취소" : "💘 큐피드"}
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label>비교 메모</Label>
          <Textarea
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 가치관은 비슷한데 라이프스타일에서 차이가 좀 있을 듯…"
          />
        </div>
        {introduced ? (
          <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 space-y-3">
            <p className="text-[11px] text-[var(--color-fg-muted)]">
              {introducedAt
                ? `💘 큐피드 발동: ${formatDateTime(introducedAt)}`
                : "💘 큐피드 발동됨"}
            </p>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div>
                <Label>결과</Label>
                <Select
                  value={outcome}
                  onChange={(e) => onOutcomeChange(e.target.value)}
                >
                  <option value="">선택…</option>
                  {(
                    Object.keys(PAIR_OUTCOME_LABEL) as Array<
                      keyof typeof PAIR_OUTCOME_LABEL
                    >
                  ).map((k) => (
                    <option key={k} value={k}>
                      {PAIR_OUTCOME_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>결과 메모</Label>
                <Textarea
                  rows={2}
                  value={outcomeMemo}
                  onChange={(e) => setOutcomeMemo(e.target.value)}
                  placeholder="예: 둘이 한 번 만나봤다고 함"
                />
              </div>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
