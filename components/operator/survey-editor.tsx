"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import {
  QUESTION_TYPE_LABEL,
  type QuestionType,
  type SurveyChapter,
  type SurveyQuestion,
} from "@/lib/types/domain";
import {
  createChapterAction,
  createQuestionAction,
  deleteChapterAction,
  deleteQuestionAction,
  updateChapterAction,
  updateQuestionAction,
} from "@/app/(operator)/surveys/actions";

type Props = {
  surveyId: string;
  chapters: SurveyChapter[];
  questions: SurveyQuestion[];
  /** Whether to allow free-text question type. Standard=false, custom=true. */
  allowText: boolean;
};

export function SurveyEditor({ surveyId, chapters, questions, allowText }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const grouped = new Map<string, SurveyQuestion[]>();
  for (const q of questions) {
    const arr = grouped.get(q.chapter_id) ?? [];
    arr.push(q);
    grouped.set(q.chapter_id, arr);
  }

  const addChapter = () => {
    startTransition(async () => {
      await createChapterAction({
        surveyId,
        title: `새 챕터 ${chapters.length + 1}`,
        orderIndex: chapters.length,
      });
      refresh();
    });
  };

  return (
    <div className="space-y-4">
      {chapters.length === 0 ? (
        <EmptyState
          title="아직 챕터가 없어요"
          description="첫 챕터부터 만들어볼까요?"
          action={
            <Button onClick={addChapter} disabled={isPending}>
              ＋ 첫 챕터 추가
            </Button>
          }
        />
      ) : (
        chapters.map((chapter, idx) => (
          <ChapterCard
            key={chapter.id}
            index={idx}
            chapter={chapter}
            questions={grouped.get(chapter.id) ?? []}
            allowText={allowText}
            disabled={isPending}
            onChanged={refresh}
          />
        ))
      )}

      {chapters.length > 0 ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={addChapter} disabled={isPending}>
            ＋ 챕터 추가
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ChapterCard({
  index,
  chapter,
  questions,
  allowText,
  disabled,
  onChanged,
}: {
  index: number;
  chapter: SurveyChapter;
  questions: SurveyQuestion[];
  allowText: boolean;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description ?? "");
  const [resultTemplate, setResultTemplate] = useState(
    chapter.result_template ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState(false);

  const onSaveChapter = () => {
    startTransition(async () => {
      await updateChapterAction(chapter.id, {
        title,
        description: description || null,
        resultTemplate: resultTemplate || null,
      });
      setEditing(false);
      onChanged();
    });
  };

  const onDeleteChapter = () => {
    startTransition(async () => {
      await deleteChapterAction(chapter.id);
      onChanged();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[var(--color-fg-muted)]">
              챕터 {index + 1}
            </p>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="챕터 제목"
                />
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명 (선택)"
                />
                <Textarea
                  rows={2}
                  value={resultTemplate}
                  onChange={(e) => setResultTemplate(e.target.value)}
                  placeholder="챕터 클리어 시 친구에게 보여줄 결과 메시지 (선택)"
                />
              </div>
            ) : (
              <>
                <CardTitle>{chapter.title}</CardTitle>
                {chapter.description ? (
                  <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                    {chapter.description}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={pending}
                >
                  취소
                </Button>
                <Button size="sm" onClick={onSaveChapter} disabled={pending}>
                  저장
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  disabled={disabled}
                >
                  편집
                </Button>
                {confirmDelete ? (
                  <>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">
                      삭제할까요?
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={onDeleteChapter}
                      disabled={pending}
                    >
                      예
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      disabled={pending}
                    >
                      아니오
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(true)}
                    disabled={disabled}
                  >
                    삭제
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {questions.length === 0 ? (
          <p className="text-xs text-[var(--color-fg-muted)]">
            아직 문항이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={i}
                allowText={allowText}
                onChanged={onChanged}
              />
            ))}
          </ul>
        )}
        {adding ? (
          <NewQuestionEditor
            chapterId={chapter.id}
            allowText={allowText}
            startOrder={questions.length}
            onCancel={() => setAdding(false)}
            onCreated={() => {
              setAdding(false);
              onChanged();
            }}
          />
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAdding(true)}
            disabled={disabled}
          >
            ＋ 문항 추가
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

function QuestionRow({
  question,
  index,
  allowText,
  onChanged,
}: {
  question: SurveyQuestion;
  index: number;
  allowText: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      await deleteQuestionAction(question.id);
      onChanged();
    });
  };

  if (editing) {
    return (
      <li>
        <QuestionEditor
          initial={question}
          allowText={allowText}
          chapterId={question.chapter_id}
          orderIndex={question.order_index}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)]">
            <span>문항 {index + 1}</span>
            <Badge variant="outline">{QUESTION_TYPE_LABEL[question.type]}</Badge>
            {question.required ? <Badge variant="pink">필수</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-fg">{question.prompt}</p>
          <QuestionOptionsPreview question={question} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            편집
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            disabled={pending}
          >
            삭제
          </Button>
        </div>
      </div>
    </li>
  );
}

function QuestionOptionsPreview({ question }: { question: SurveyQuestion }) {
  const opts = question.options as unknown;
  if (!opts) return null;
  if (
    (question.type === "mcq_single" || question.type === "mcq_multi") &&
    Array.isArray(opts)
  ) {
    return (
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {(opts as string[]).map((o, i) => (
          <li
            key={i}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-2 py-0.5 text-[11px]"
          >
            {o}
          </li>
        ))}
      </ul>
    );
  }
  if (question.type === "ranking" && Array.isArray(opts)) {
    return (
      <ol className="mt-1.5 list-decimal pl-5 text-[11px] text-[var(--color-fg-muted)]">
        {(opts as string[]).map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ol>
    );
  }
  if (
    question.type === "likert" &&
    typeof opts === "object" &&
    opts !== null &&
    "min" in opts
  ) {
    const o = opts as { min: number; max: number; minLabel?: string; maxLabel?: string };
    return (
      <p className="mt-1.5 text-[11px] text-[var(--color-fg-muted)]">
        {o.min} ({o.minLabel ?? ""}) — {o.max} ({o.maxLabel ?? ""})
      </p>
    );
  }
  return null;
}

function NewQuestionEditor(props: {
  chapterId: string;
  allowText: boolean;
  startOrder: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  return (
    <QuestionEditor
      chapterId={props.chapterId}
      allowText={props.allowText}
      orderIndex={props.startOrder}
      onCancel={props.onCancel}
      onSaved={props.onCreated}
    />
  );
}

function QuestionEditor({
  initial,
  chapterId,
  orderIndex,
  allowText,
  onCancel,
  onSaved,
}: {
  initial?: SurveyQuestion;
  chapterId: string;
  orderIndex: number;
  allowText: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "mcq_single");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [pending, startTransition] = useTransition();

  // Per-type local state
  const initOptArr = Array.isArray(initial?.options)
    ? (initial?.options as string[])
    : [];
  const [choices, setChoices] = useState<string[]>(
    type === "mcq_single" || type === "mcq_multi" || type === "ranking"
      ? initOptArr.length > 0
        ? initOptArr
        : ["옵션 1", "옵션 2"]
      : ["옵션 1", "옵션 2"],
  );
  const initLikert =
    initial?.type === "likert" && initial?.options
      ? (initial.options as {
          min: number;
          max: number;
          minLabel?: string;
          maxLabel?: string;
        })
      : { min: 1, max: 5, minLabel: "전혀 아니다", maxLabel: "매우 그렇다" };
  const [likert, setLikert] = useState(initLikert);

  const buildOptions = (): unknown => {
    if (type === "mcq_single" || type === "mcq_multi" || type === "ranking") {
      return choices.filter((c) => c.trim());
    }
    if (type === "likert") {
      return likert;
    }
    return null;
  };

  const onSave = () => {
    if (!prompt.trim()) return;
    const options = buildOptions();
    startTransition(async () => {
      if (initial) {
        await updateQuestionAction(initial.id, {
          prompt,
          type,
          options,
          required,
          orderIndex,
        });
      } else {
        await createQuestionAction({
          chapterId,
          type,
          prompt,
          options,
          required,
          orderIndex,
        });
      }
      onSaved();
    });
  };

  return (
    <div className="rounded-lg border border-pink-500/30 bg-[var(--color-surface-2)]/60 p-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
        <div>
          <Label htmlFor="qtype">유형</Label>
          <Select
            id="qtype"
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
          >
            <option value="mcq_single">객관식 (단일)</option>
            <option value="mcq_multi">객관식 (다중)</option>
            <option value="likert">점수 척도</option>
            <option value="ranking">우선순위</option>
            {allowText ? <option value="text">주관식</option> : null}
          </Select>
        </div>
        <div>
          <Label htmlFor="qprompt">질문</Label>
          <Input
            id="qprompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="질문을 입력하세요"
          />
        </div>
      </div>

      {(type === "mcq_single" ||
        type === "mcq_multi" ||
        type === "ranking") && (
        <ChoicesEditor
          label={type === "ranking" ? "우선순위 항목" : "선택지"}
          choices={choices}
          onChange={setChoices}
        />
      )}

      {type === "likert" && (
        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <Label>최소</Label>
            <Input
              type="number"
              value={likert.min}
              onChange={(e) =>
                setLikert((p) => ({ ...p, min: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label>최대</Label>
            <Input
              type="number"
              value={likert.max}
              onChange={(e) =>
                setLikert((p) => ({ ...p, max: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label>최소 라벨</Label>
            <Input
              value={likert.minLabel ?? ""}
              onChange={(e) =>
                setLikert((p) => ({ ...p, minLabel: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>최대 라벨</Label>
            <Input
              value={likert.maxLabel ?? ""}
              onChange={(e) =>
                setLikert((p) => ({ ...p, maxLabel: e.target.value }))
              }
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="accent-pink-500"
        />
        필수 응답
      </label>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button size="sm" onClick={onSave} disabled={pending || !prompt.trim()}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}

function ChoicesEditor({
  label,
  choices,
  onChange,
}: {
  label: string;
  choices: string[];
  onChange: (next: string[]) => void;
}) {
  const update = (i: number, v: string) => {
    const next = choices.slice();
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(choices.filter((_, idx) => idx !== i));
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={c}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`옵션 ${i + 1}`}
            />
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => remove(i)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...choices, ""])}
        className="mt-2 text-xs text-pink-400 hover:text-pink-300"
      >
        ＋ 옵션 추가
      </button>
    </div>
  );
}
