"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Field, FormSection } from "@/components/ui/field";
import { MultiSelectChip } from "@/components/ui/multi-select-chip";
import { RegionDetailPicker } from "@/components/ui/region-detail-picker";
import { RangeSlider } from "@/components/ui/range-slider";
import { RankingPicker } from "@/components/ui/ranking-picker";
import {
  JOB_OPTIONS,
  PERSONALITY_KEYWORDS,
  PRIORITY_CATEGORIES,
  SMOKING_OPTIONS,
  DRINKING_OPTIONS,
  MARRIAGE_TIMING_OPTIONS,
  TATTOO_OPTIONS,
  BIRTH_YEAR_MIN,
  BIRTH_YEAR_MAX,
  type RegionDetailValue,
} from "@/lib/types/v2-options";

/**
 * V2 온보딩 Step 2 + `/me/preferences` 공용 폼.
 * PRD §3.3.3 — 3단 구조:
 *   §1 선호 조건 (구조화 8개) — 나이대 / 거주지역 / 출신지역 / 흡연 / 음주 / 결혼관 / 직업군 / 문신
 *   §2 성격·결 — 키워드 15개 + 자유 텍스트 300자
 *   §3 매칭 우선순위 — 6 카테고리 top 3 ranking
 *
 * TODO(worker, task-B / task-C):
 *  - action 을 server action 으로 교체. FormData 에는:
 *      - 단일값: smoking/drinking/marriage_timing/tattoo/hometown_same_bonus/free_text/age_from/age_to
 *      - 다중값: regions[], hometowns[], jobs[], personality_keywords[]
 *      - ranking: priorities_rank_1, _2, _3
 *  - DB 저장은 friend_ideals 1:1 + 1:N 테이블 4개 + ranked priorities 테이블
 *  - 컨트롤러는 useState 그대로 유지 — submit 시 FormData 직렬화는 hidden input 으로 자동 처리됨 (MultiSelectChip/RankingPicker/RangeSlider 가 name prop 받음)
 */
export type PreferencesFormDefaults = Partial<{
  age_from: number;
  age_to: number;
  /** 012 — 2단계 region (광역+detail) 객체 배열. detail '' = 광역 전체. */
  regions: RegionDetailValue[];
  hometowns: RegionDetailValue[];
  hometown_same_bonus: boolean;
  smoking: string;
  drinking: string;
  marriage_timing: string;
  jobs: string[];
  tattoo: string;
  personality_keywords: string[];
  free_text: string;
  priorities: string[];
}>;

export function PreferencesForm({
  action,
  defaultValues,
  variant = "onboarding",
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: PreferencesFormDefaults;
  variant?: "onboarding" | "edit";
}) {
  // §1
  const [ageFrom, setAgeFrom] = React.useState<number | null>(
    defaultValues?.age_from ?? null,
  );
  const [ageTo, setAgeTo] = React.useState<number | null>(
    defaultValues?.age_to ?? null,
  );
  const [regions, setRegions] = React.useState<RegionDetailValue[]>(
    defaultValues?.regions ?? [],
  );
  const [hometowns, setHometowns] = React.useState<RegionDetailValue[]>(
    defaultValues?.hometowns ?? [],
  );
  const [hometownSameBonus, setHometownSameBonus] = React.useState(
    defaultValues?.hometown_same_bonus ?? false,
  );
  const [smoking, setSmoking] = React.useState(defaultValues?.smoking ?? "any");
  const [drinking, setDrinking] = React.useState(
    defaultValues?.drinking ?? "any",
  );
  const [marriageTiming, setMarriageTiming] = React.useState(
    defaultValues?.marriage_timing ?? "any",
  );
  const [jobs, setJobs] = React.useState<string[]>(defaultValues?.jobs ?? []);
  const [tattoo, setTattoo] = React.useState(defaultValues?.tattoo ?? "any");

  // §2
  const [personalityKeywords, setPersonalityKeywords] = React.useState<string[]>(
    defaultValues?.personality_keywords ?? [],
  );
  const [freeText, setFreeText] = React.useState(defaultValues?.free_text ?? "");

  // §3
  const [priorities, setPriorities] = React.useState<string[]>(
    defaultValues?.priorities ?? [],
  );

  return (
    <form action={action} className="space-y-4">
      <FormSection title="§1 선호 조건" subtitle="채워둔 항목만 매칭에 반영돼요">
        <Field
          label="선호 나이대 (출생연도)"
          hint="from~to 범위로 잡아주세요. 안 잡으면 상관없음."
        >
          <RangeSlider
            name="age"
            min={BIRTH_YEAR_MIN}
            max={BIRTH_YEAR_MAX}
            valueFrom={ageFrom}
            valueTo={ageTo}
            onChange={(f, t) => {
              setAgeFrom(f);
              setAgeTo(t);
            }}
            labelFrom="From"
            labelTo="To"
            formatValue={(v) => `${v}년생`}
          />
        </Field>

        <Field
          label="선호 거주지역"
          hint="광역 행을 펼쳐 구·시 단위까지 선택할 수 있어요"
        >
          <RegionDetailPicker
            name="regions"
            value={regions}
            onValueChange={setRegions}
            emptyHint="선택 안 함 = 상관없음"
          />
        </Field>

        <Field
          label="선호 출신지역"
          hint="광역 행을 펼쳐 구·시 단위까지 선택할 수 있어요"
        >
          <RegionDetailPicker
            name="hometowns"
            value={hometowns}
            onValueChange={setHometowns}
            emptyHint="선택 안 함 = 상관없음"
          />
        </Field>

        <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <input
            type="checkbox"
            name="hometown_same_bonus"
            checked={hometownSameBonus}
            onChange={(e) => setHometownSameBonus(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-pink-500)]"
          />
          <span className="text-xs text-fg">
            나와 같은 출신지역이면 더 좋아요
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="흡연" htmlFor="smoking">
            <Select
              id="smoking"
              name="smoking"
              value={smoking}
              onChange={(e) => setSmoking(e.target.value)}
            >
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="음주" htmlFor="drinking">
            <Select
              id="drinking"
              name="drinking"
              value={drinking}
              onChange={(e) => setDrinking(e.target.value)}
            >
              {DRINKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="결혼 시점관" htmlFor="marriage_timing">
            <Select
              id="marriage_timing"
              name="marriage_timing"
              value={marriageTiming}
              onChange={(e) => setMarriageTiming(e.target.value)}
            >
              {MARRIAGE_TIMING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="문신" htmlFor="tattoo">
            <Select
              id="tattoo"
              name="tattoo"
              value={tattoo}
              onChange={(e) => setTattoo(e.target.value)}
            >
              {TATTOO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="선호 직업군" hint="여러 개 선택 가능">
          <MultiSelectChip
            name="jobs"
            options={JOB_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={jobs}
            onValueChange={setJobs}
            emptyHint="선택 안 함 = 상관없음"
          />
        </Field>
      </FormSection>

      <FormSection
        title="§2 성격·결"
        subtitle="키워드로 못 잡히는 결은 아래 자유 텍스트에"
      >
        <Field label="성격 키워드 (다중 선택)">
          <MultiSelectChip
            name="personality_keywords"
            options={PERSONALITY_KEYWORDS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={personalityKeywords}
            onValueChange={setPersonalityKeywords}
            emptyHint="끌리는 키워드를 몇 개 골라봐요"
          />
        </Field>

        <Field label="이상형 한마디 (자유)" hint="최대 300자">
          <Textarea
            name="free_text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, 300))}
            placeholder="이런 사람과 잘 맞을 것 같아요…"
            rows={4}
            maxLength={300}
          />
          <p className="text-right text-[10px] text-[var(--color-fg-subtle)]">
            {freeText.length}/300
          </p>
        </Field>
      </FormSection>

      <FormSection
        title="§3 매칭 우선순위 (top 3)"
        subtitle="가장 중요한 3가지를 순서대로 골라주세요"
      >
        <RankingPicker
          name="priorities"
          options={PRIORITY_CATEGORIES.map((o) => ({
            value: o.value,
            label: o.label,
            emoji: o.emoji,
            description: o.description,
          }))}
          value={priorities}
          onValueChange={setPriorities}
        />
      </FormSection>

      <Button size="lg" type="submit" className="w-full">
        {variant === "edit" ? "저장" : "저장하고 다음 →"}
      </Button>
    </form>
  );
}
