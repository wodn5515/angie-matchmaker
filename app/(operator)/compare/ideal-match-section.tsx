import * as React from "react";
import {
  IdealMatchPanel,
  IdealMatchRow,
} from "@/components/operator/ideal-match-row";
import {
  compareIdealValues,
  compareIdealRegions,
  compareIdealHometowns,
  type FriendIdealAggregate,
} from "@/lib/db/ideals";
import { compareSelfTrait } from "@/lib/db/self-trait-match";
import {
  SMOKING_LABEL,
  DRINKING_LABEL,
  MARRIAGE_TIMING_LABEL,
  TATTOO_LABEL,
  getRegionFullLabel,
  getHometownFullLabel,
  getJobLabel,
  getSmokingLabel,
  getDrinkingLabel,
  getMarriageViewLabel,
  getTattooLabel,
} from "@/lib/types/v2-options";
import type { Friend } from "@/lib/types/domain";

/**
 * 비교 뷰 — 이상형 양방향 매칭 (PRD §3.4.2 / §6.5).
 *
 * A 의 이상형 vs B 의 프로필 (8 항목) + B 의 이상형 vs A 의 프로필 (8 항목).
 * 각 항목은 compareIdealValues 로 4종(same/partial/different/neutral) 분류.
 *
 * V2 (009) 부터 smoking/drinking/marriage_view/tattoo 도 friends 컬럼에 자기
 * 보고가 들어와 양방향 매칭이 활성화된다. 이상형 enum 과 본인 enum 의 셋·카디
 * 널리티가 달라 `compareSelfTrait` 가 항목별 매트릭스로 same/partial/different/
 * neutral 을 판정한다.
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

  // 2. 선호 거주지역 (012 — 2단계 region+detail)
  rows.push({
    label: "선호 거주지역",
    idealText:
      ideals.regions.length === 0
        ? "상관없음"
        : ideals.regions
            .map((r) =>
              r.region_detail
                ? getRegionFullLabel(r.region, r.region_detail)
                : `${getRegionFullLabel(r.region, "")} 전체`,
            )
            .join(", "),
    actualText: target.region
      ? getRegionFullLabel(target.region, target.region_detail)
      : "—",
    tone: compareIdealRegions({
      ideal: ideals.regions.map((r) => ({
        region: r.region,
        detail: r.region_detail,
      })),
      self: { region: target.region, detail: target.region_detail },
    }),
  });

  // 3. 선호 출신지역 (012 — 2단계 hometown+detail)
  rows.push({
    label: "선호 출신지역",
    idealText:
      ideals.hometowns.length === 0
        ? "상관없음"
        : ideals.hometowns
            .map((r) =>
              r.hometown_detail
                ? getHometownFullLabel(r.hometown, r.hometown_detail)
                : `${getHometownFullLabel(r.hometown, "")} 전체`,
            )
            .join(", "),
    actualText: target.hometown
      ? getHometownFullLabel(target.hometown, target.hometown_detail)
      : "—",
    tone: compareIdealHometowns({
      ideal: ideals.hometowns.map((r) => ({
        region: r.hometown,
        detail: r.hometown_detail,
      })),
      self: { region: target.hometown, detail: target.hometown_detail },
    }),
  });

  // 4. 흡연 — V2 (009) 부터 본인 컬럼 활성. compareSelfTrait 가 매트릭스 처리.
  rows.push({
    label: "흡연",
    idealText: ideals.ideals?.smoking
      ? SMOKING_LABEL[ideals.ideals.smoking]
      : "상관없음",
    actualText: target.smoking ? getSmokingLabel(target.smoking) : "—",
    tone: compareSelfTrait({
      idealValue: ideals.ideals?.smoking ?? null,
      profileValue: target.smoking,
      kind: "smoking",
    }),
  });

  // 5. 음주
  rows.push({
    label: "음주",
    idealText: ideals.ideals?.drinking
      ? DRINKING_LABEL[ideals.ideals.drinking]
      : "상관없음",
    actualText: target.drinking ? getDrinkingLabel(target.drinking) : "—",
    tone: compareSelfTrait({
      idealValue: ideals.ideals?.drinking ?? null,
      profileValue: target.drinking,
      kind: "drinking",
    }),
  });

  // 6. 결혼관 (이상형: marriage_timing / 본인: marriage_view — 셋이 같은 enum 도메인)
  rows.push({
    label: "결혼관",
    idealText: ideals.ideals?.marriage_timing
      ? MARRIAGE_TIMING_LABEL[ideals.ideals.marriage_timing]
      : "상관없음",
    actualText: target.marriage_view
      ? getMarriageViewLabel(target.marriage_view)
      : "—",
    tone: compareSelfTrait({
      idealValue: ideals.ideals?.marriage_timing ?? null,
      profileValue: target.marriage_view,
      kind: "marriage_view",
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
    actualText: target.tattoo ? getTattooLabel(target.tattoo) : "—",
    tone: compareSelfTrait({
      idealValue: ideals.ideals?.tattoo ?? null,
      profileValue: target.tattoo,
      kind: "tattoo",
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
