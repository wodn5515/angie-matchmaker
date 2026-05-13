import * as React from "react";
import {
  IdealMatchPanel,
  IdealMatchRow,
} from "@/components/operator/ideal-match-row";
import {
  compareIdealValues,
  type FriendIdealAggregate,
} from "@/lib/db/ideals";
import {
  SMOKING_LABEL,
  DRINKING_LABEL,
  MARRIAGE_TIMING_LABEL,
  TATTOO_LABEL,
  getRegionLabel,
  getHometownLabel,
  getJobLabel,
} from "@/lib/types/v2-options";
import type { Friend } from "@/lib/types/domain";

/**
 * 비교 뷰 — 이상형 양방향 매칭 (PRD §3.4.2 / §6.5).
 *
 * A 의 이상형 vs B 의 프로필 (8 항목) + B 의 이상형 vs A 의 프로필 (8 항목).
 * 각 항목은 compareIdealValues 로 4종(same/partial/different/neutral) 분류.
 *
 * 일부 항목 (smoking/drinking/marriage_timing/tattoo) 은 V2 friends 컬럼에
 * 자기 보고가 없어 항상 neutral 로 표시됨 — V2.x 에서 profile 측 도입 시 확장.
 */
export function IdealMatchSection({
  friendA,
  friendB,
  idealsA,
  idealsB,
}: {
  friendA: Friend;
  friendB: Friend;
  idealsA: FriendIdealAggregate;
  idealsB: FriendIdealAggregate;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-fg">💞 이상형 양방향 매칭</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Direction
          title={`${friendA.name} 의 이상형 ↔ ${friendB.name} 프로필`}
          subtitle="A → B"
          ideals={idealsA}
          target={friendB}
        />
        <Direction
          title={`${friendB.name} 의 이상형 ↔ ${friendA.name} 프로필`}
          subtitle="B → A"
          ideals={idealsB}
          target={friendA}
        />
      </div>
    </section>
  );
}

function Direction({
  title,
  subtitle,
  ideals,
  target,
}: {
  title: string;
  subtitle: string;
  ideals: FriendIdealAggregate;
  target: Friend;
}) {
  // 8 항목 비교 — 각각 한 줄씩
  const rows: Array<{
    label: string;
    idealText: React.ReactNode;
    actualText: React.ReactNode;
    tone: "same" | "partial" | "different" | "neutral";
  }> = [];

  // 1. 선호 나이대 (year_range vs birth_year)
  const ageRange = {
    from: ideals.ideals?.age_from ?? null,
    to: ideals.ideals?.age_to ?? null,
  };
  rows.push({
    label: "선호 나이대 (출생연도)",
    idealText:
      ageRange.from || ageRange.to
        ? `${ageRange.from ?? "—"}년생 ~ ${ageRange.to ?? "—"}년생`
        : "상관없음",
    actualText: target.birth_year ? `${target.birth_year}년생` : "—",
    tone: compareIdealValues({
      ideal: ageRange,
      profile: target.birth_year,
      kind: "year_range",
    }),
  });

  // 2. 선호 거주지역 (multi vs region)
  rows.push({
    label: "선호 거주지역",
    idealText:
      ideals.regions.length === 0
        ? "상관없음"
        : ideals.regions.map((r) => getRegionLabel(r)).join(", "),
    actualText: target.region ? getRegionLabel(target.region) : "—",
    tone: compareIdealValues({
      ideal: ideals.regions,
      profile: target.region,
      kind: "multi",
    }),
  });

  // 3. 선호 출신지역 (multi vs hometown)
  rows.push({
    label: "선호 출신지역",
    idealText:
      ideals.hometowns.length === 0
        ? "상관없음"
        : ideals.hometowns.map((r) => getHometownLabel(r)).join(", "),
    actualText: target.hometown ? getHometownLabel(target.hometown) : "—",
    tone: compareIdealValues({
      ideal: ideals.hometowns,
      profile: target.hometown,
      kind: "multi",
    }),
  });

  // 4. 흡연 — V2 friends 에 profile.smoking 미존재 → 항상 neutral
  rows.push({
    label: "흡연",
    idealText: ideals.ideals?.smoking
      ? SMOKING_LABEL[ideals.ideals.smoking]
      : "상관없음",
    actualText: "—",
    tone: compareIdealValues({
      ideal: ideals.ideals?.smoking ?? null,
      profile: null,
      kind: "single",
    }),
  });

  // 5. 음주
  rows.push({
    label: "음주",
    idealText: ideals.ideals?.drinking
      ? DRINKING_LABEL[ideals.ideals.drinking]
      : "상관없음",
    actualText: "—",
    tone: compareIdealValues({
      ideal: ideals.ideals?.drinking ?? null,
      profile: null,
      kind: "single",
    }),
  });

  // 6. 결혼 시점관
  rows.push({
    label: "결혼 시점관",
    idealText: ideals.ideals?.marriage_timing
      ? MARRIAGE_TIMING_LABEL[ideals.ideals.marriage_timing]
      : "상관없음",
    actualText: "—",
    tone: compareIdealValues({
      ideal: ideals.ideals?.marriage_timing ?? null,
      profile: null,
      kind: "single",
    }),
  });

  // 7. 선호 직업군 (multi vs occupation)
  rows.push({
    label: "선호 직업군",
    idealText:
      ideals.jobs.length === 0
        ? "상관없음"
        : ideals.jobs.map((j) => getJobLabel(j)).join(", "),
    actualText: target.occupation ? getJobLabel(target.occupation) : "—",
    tone: compareIdealValues({
      ideal: ideals.jobs,
      profile: target.occupation,
      kind: "multi",
    }),
  });

  // 8. 문신
  rows.push({
    label: "문신",
    idealText: ideals.ideals?.tattoo
      ? TATTOO_LABEL[ideals.ideals.tattoo]
      : "상관없음",
    actualText: "—",
    tone: compareIdealValues({
      ideal: ideals.ideals?.tattoo ?? null,
      profile: null,
      kind: "single",
    }),
  });

  return (
    <IdealMatchPanel title={title} subtitle={subtitle}>
      {rows.map((r, i) => (
        <IdealMatchRow
          key={i}
          label={r.label}
          idealText={r.idealText}
          actualText={r.actualText}
          tone={r.tone}
        />
      ))}
    </IdealMatchPanel>
  );
}
