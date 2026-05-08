"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AnswerView } from "@/components/operator/answer-display";
import { formatDateTime } from "@/lib/utils";
import type {
  SurveyAnswer,
  SurveyChapter,
  SurveyInvitation,
  SurveyQuestion,
  Survey,
} from "@/lib/types/domain";

type CompletedRow = {
  invitation: SurveyInvitation;
  survey: Survey;
  chapters: SurveyChapter[];
  questions: SurveyQuestion[];
  answers: SurveyAnswer[];
};

export function InvitationHistory({
  pendingInvitations,
  completedBundles,
}: {
  pendingInvitations: SurveyInvitation[];
  completedBundles: CompletedRow[];
}) {
  if (pendingInvitations.length === 0 && completedBundles.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-xs text-[var(--color-fg-muted)]">
        아직 발송 이력이 없어요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {pendingInvitations.map((inv) => (
        <li
          key={inv.id}
          className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
        >
          <div className="min-w-0">
            <p className="text-fg">
              {inv.status === "in_progress" ? "응답 중" : "미응답"}
            </p>
            <p className="text-[11px] text-[var(--color-fg-muted)]">
              발송 {formatDateTime(inv.created_at)}
            </p>
          </div>
          <Badge variant={inv.status === "in_progress" ? "warn" : "outline"}>
            {inv.status === "in_progress" ? "진행중" : "대기"}
          </Badge>
        </li>
      ))}
      {completedBundles.map((b) => (
        <CompletedRow key={b.invitation.id} bundle={b} />
      ))}
    </ul>
  );
}

function CompletedRow({ bundle }: { bundle: CompletedRow }) {
  const [open, setOpen] = useState(false);
  const { invitation, survey, chapters, questions, answers } = bundle;
  const ansByQ = new Map(answers.map((a) => [a.question_id, a.value]));
  const answeredCount = questions.filter((q) => {
    const v = ansByQ.get(q.id);
    return !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
  }).length;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-left hover:bg-[var(--color-surface-2)]/40 transition"
      >
        <div className="min-w-0">
          <p className="text-fg flex items-center gap-1.5">
            <span>응답 완료</span>
            <span className="text-[11px] text-[var(--color-fg-muted)] font-normal">
              · {survey.type === "standard" ? "[표준]" : "[커스텀]"} {survey.title}
            </span>
          </p>
          <p className="text-[11px] text-[var(--color-fg-muted)]">
            발송 {formatDateTime(invitation.created_at)}
            {invitation.completed_at
              ? ` · 완료 ${formatDateTime(invitation.completed_at)}`
              : ""}
            {questions.length > 0
              ? ` · ${answeredCount}/${questions.length} 응답`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="success">완료</Badge>
          <span
            className={
              "text-[var(--color-fg-muted)] transition-transform " +
              (open ? "rotate-180" : "")
            }
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>
      {open ? (
        <div className="bg-[var(--color-surface-2)]/30 border-t border-[var(--color-border)] px-5 py-4">
          {chapters.length === 0 || questions.length === 0 ? (
            <p className="text-[11px] text-[var(--color-fg-muted)]">
              이 설문에 문항이 없어요.
            </p>
          ) : (
            <div className="space-y-4">
              {chapters.map((ch, ci) => {
                const chQuestions = questions.filter(
                  (q) => q.chapter_id === ch.id,
                );
                if (chQuestions.length === 0) return null;
                return (
                  <div key={ch.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="pink">챕터 {ci + 1}</Badge>
                      <h4 className="text-xs font-semibold text-fg">
                        {ch.title}
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {chQuestions.map((q, qi) => (
                        <li
                          key={q.id}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2"
                        >
                          <p className="text-[11px] text-[var(--color-fg-muted)]">
                            Q{qi + 1}
                          </p>
                          <p className="text-sm text-fg">{q.prompt}</p>
                          <div className="mt-2 text-sm">
                            <AnswerView
                              question={q}
                              value={ansByQ.get(q.id)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}
