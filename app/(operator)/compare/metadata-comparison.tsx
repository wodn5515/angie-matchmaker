import { cn } from "@/lib/utils";
import {
  type Friend,
  GENDER_LABEL,
  PREFERRED_GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
} from "@/lib/types/domain";
import {
  getRegionLabel,
  getHometownLabel,
  getJobLabel,
  getSmokingLabel,
  getDrinkingLabel,
  getMarriageViewLabel,
  getTattooLabel,
} from "@/lib/types/v2-options";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { profileCompletion } from "@/lib/db/friends";

type Row = {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  /** Optional: signal whether the two values are a "match" for highlighting. */
  matchKind?: "same" | "different" | "missing" | "neutral";
};

export function MetadataComparison({
  friendA,
  friendB,
}: {
  friendA: Friend;
  friendB: Friend;
}) {
  const rows = buildRows(friendA, friendB);
  const pctA = profileCompletion(friendA);
  const pctB = profileCompletion(friendB);

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로필 비교</CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] gap-x-3 gap-y-0 text-sm">
          <HeaderCell label="" />
          <HeaderCell label={friendA.name} pct={pctA} />
          <HeaderCell label={friendB.name} pct={pctB} />
          {rows.map((r, i) => (
            <DataRow key={i} row={r} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function HeaderCell({ label, pct }: { label: string; pct?: number }) {
  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40">
      <p className="text-sm font-semibold text-fg truncate">{label}</p>
      {pct != null ? (
        <p className="mt-0.5 text-[10px] text-[var(--color-fg-muted)]">
          완성도{" "}
          <span className="text-pink-400 font-medium">{pct}%</span>
        </p>
      ) : null}
    </div>
  );
}

function DataRow({ row }: { row: Row }) {
  const sameClass =
    row.matchKind === "same"
      ? "bg-[var(--color-success)]/8"
      : row.matchKind === "different"
        ? "bg-[var(--color-danger)]/6"
        : "";
  const valueClass = cn(
    "px-4 py-2.5 border-b border-[var(--color-border)]/50 text-fg",
    sameClass,
  );
  return (
    <>
      <div className="px-4 py-2.5 border-b border-[var(--color-border)]/50 text-[11px] text-[var(--color-fg-muted)] flex items-center">
        {row.label}
      </div>
      <div className={valueClass}>{row.a}</div>
      <div className={valueClass}>{row.b}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row builder

function buildRows(a: Friend, b: Friend): Row[] {
  const rows: Row[] = [];

  rows.push(eq("성별", GENDER_LABEL[a.gender], GENDER_LABEL[b.gender]));
  rows.push(
    eq(
      "선호 성별",
      PREFERRED_GENDER_LABEL[a.preferred_gender],
      PREFERRED_GENDER_LABEL[b.preferred_gender],
    ),
  );
  rows.push(num("출생 연도", a.birth_year, b.birth_year));
  rows.push(
    text(
      "거주 지역",
      a.region ? getRegionLabel(a.region) : null,
      b.region ? getRegionLabel(b.region) : null,
    ),
  );
  rows.push(
    text(
      "출신 지역",
      a.hometown ? getHometownLabel(a.hometown) : null,
      b.hometown ? getHometownLabel(b.hometown) : null,
    ),
  );
  rows.push(
    text(
      "직업",
      a.occupation ? getJobLabel(a.occupation) : null,
      b.occupation ? getJobLabel(b.occupation) : null,
    ),
  );
  rows.push(
    text(
      "연애 상태",
      a.relationship_status
        ? RELATIONSHIP_STATUS_LABEL[a.relationship_status]
        : null,
      b.relationship_status
        ? RELATIONSHIP_STATUS_LABEL[b.relationship_status]
        : null,
    ),
  );
  rows.push(
    text(
      "매칭 관심도",
      a.match_interest ? MATCH_INTEREST_LABEL[a.match_interest] : null,
      b.match_interest ? MATCH_INTEREST_LABEL[b.match_interest] : null,
    ),
  );
  // 자기 보고 4 항목 (009) — 같음/다름 색상 단서.
  rows.push(
    text(
      "흡연",
      a.smoking ? getSmokingLabel(a.smoking) : null,
      b.smoking ? getSmokingLabel(b.smoking) : null,
    ),
  );
  rows.push(
    text(
      "음주",
      a.drinking ? getDrinkingLabel(a.drinking) : null,
      b.drinking ? getDrinkingLabel(b.drinking) : null,
    ),
  );
  rows.push(
    text(
      "결혼관",
      a.marriage_view ? getMarriageViewLabel(a.marriage_view) : null,
      b.marriage_view ? getMarriageViewLabel(b.marriage_view) : null,
    ),
  );
  rows.push(
    text(
      "문신",
      a.tattoo ? getTattooLabel(a.tattoo) : null,
      b.tattoo ? getTattooLabel(b.tattoo) : null,
    ),
  );
  rows.push(text("추천인", a.recommender_name, b.recommender_name));
  rows.push(
    text("추천인 관계", a.recommender_relation, b.recommender_relation),
  );
  rows.push(tagsRow(a.tags, b.tags));
  rows.push(text("인스타", a.instagram, b.instagram));
  rows.push(notesRow(a.notes, b.notes));

  return rows;
}

function eq(label: string, av: string, bv: string): Row {
  return {
    label,
    a: <span>{av}</span>,
    b: <span>{bv}</span>,
    matchKind: av === bv ? "same" : "different",
  };
}

function text(
  label: string,
  av: string | null | undefined,
  bv: string | null | undefined,
): Row {
  const aMissing = !av;
  const bMissing = !bv;
  let kind: Row["matchKind"] = "neutral";
  if (aMissing && bMissing) kind = "missing";
  else if (!aMissing && !bMissing && av === bv) kind = "same";
  return {
    label,
    a: aMissing ? <Empty /> : <span>{av}</span>,
    b: bMissing ? <Empty /> : <span>{bv}</span>,
    matchKind: kind,
  };
}

function num(
  label: string,
  av: number | null | undefined,
  bv: number | null | undefined,
): Row {
  const aMissing = av == null;
  const bMissing = bv == null;
  let kind: Row["matchKind"] = "neutral";
  if (aMissing && bMissing) kind = "missing";
  else if (!aMissing && !bMissing && av === bv) kind = "same";
  return {
    label,
    a: aMissing ? <Empty /> : <span>{av}</span>,
    b: bMissing ? <Empty /> : <span>{bv}</span>,
    matchKind: kind,
  };
}

function tagsRow(
  a: string[] | null | undefined,
  b: string[] | null | undefined,
): Row {
  const setA = new Set(a ?? []);
  const setB = new Set(b ?? []);
  const renderChips = (
    tags: string[] | null | undefined,
    other: Set<string>,
  ) => {
    const arr = tags ?? [];
    if (arr.length === 0) return <Empty />;
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((t) => (
          <Badge
            key={t}
            variant={other.has(t) ? "pink" : "neutral"}
            title={other.has(t) ? "공통 태그" : undefined}
          >
            #{t}
          </Badge>
        ))}
      </div>
    );
  };
  return {
    label: "태그",
    a: renderChips(a, setB),
    b: renderChips(b, setA),
    matchKind: "neutral",
  };
}

function notesRow(
  a: string | null | undefined,
  b: string | null | undefined,
): Row {
  const renderNote = (v: string | null | undefined) =>
    v ? (
      <p className="whitespace-pre-wrap text-[13px]">{v}</p>
    ) : (
      <Empty />
    );
  return {
    label: "자유 메모",
    a: renderNote(a),
    b: renderNote(b),
    matchKind: "neutral",
  };
}

function Empty() {
  return <span className="text-[var(--color-fg-subtle)]">—</span>;
}
