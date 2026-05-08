import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import {
  ensureStandardSurvey,
  listChapters,
  listCustomSurveys,
  listQuestionsBySurvey,
} from "@/lib/db/surveys";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const session = await requireOperator();
  const standard = await ensureStandardSurvey(session.userId);
  const [chapters, questions, customs] = await Promise.all([
    listChapters(standard.id),
    listQuestionsBySurvey(standard.id),
    listCustomSurveys(session.userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">설문 관리</p>
        <h1 className="text-2xl font-semibold tracking-tight">설문</h1>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>표준 설문</CardTitle>
            <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
              모든 친구가 동일하게 받는 베이스 설문이에요. 챕터 단위로 구성하세요.
            </p>
          </div>
          <Link href="/surveys/standard">
            <Button size="sm">편집 →</Button>
          </Link>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-3 text-sm">
          <Stat label="챕터" value={chapters.length} />
          <Stat label="문항" value={questions.length} />
          <Stat
            label="상태"
            value={chapters.length === 0 ? "비어 있음" : "준비됨"}
            tone={chapters.length === 0 ? "warn" : "success"}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>커스텀 설문</CardTitle>
            <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
              특정 친구에게 보내는 1회성 추가 설문. 응답은 운영자만 봅니다.
            </p>
          </div>
          <Link href="/surveys/custom/new">
            <Button size="sm" variant="secondary">
              ＋ 새 커스텀
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {customs.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState title="아직 커스텀 설문이 없어요" />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {customs.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <Link
                    href={`/surveys/custom/${s.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm text-fg">{s.title}</p>
                    <p className="text-[11px] text-[var(--color-fg-muted)]">
                      {formatDate(s.created_at)}
                    </p>
                  </Link>
                  <Badge variant={s.is_active ? "outline" : "neutral"}>
                    {s.is_active ? "활성" : "비활성"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "success" | "warn";
}) {
  return (
    <div>
      <p className="text-[11px] text-[var(--color-fg-muted)]">{label}</p>
      <p
        className={
          "mt-0.5 text-lg font-semibold " +
          (tone === "success"
            ? "text-[var(--color-success)]"
            : tone === "warn"
              ? "text-[var(--color-warn)]"
              : "text-fg")
        }
      >
        {value}
      </p>
    </div>
  );
}
