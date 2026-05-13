"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FormSection } from "@/components/ui/field";
import {
  REGION_OPTIONS,
  REGION_DETAIL_OPTIONS,
  JOB_OPTIONS,
  SELF_SMOKING_OPTIONS,
  SELF_DRINKING_OPTIONS,
  SELF_MARRIAGE_VIEW_OPTIONS,
  SELF_TATTOO_OPTIONS,
  type RegionCode,
} from "@/lib/types/v2-options";

/**
 * V2 온보딩 Step 1 + `/me/profile` 공용 폼 (가입자 기본 정보).
 *
 * PRD §3.1.2 / §3.3.2 — 필수 5 (이름·성별·선호 성별·추천인 이름·추천인 관계) +
 * 권장 7 (출생연도·거주지역·출신지역·직업·인스타·연애상태·매칭관심도).
 *
 * - `variant="onboarding"` → 제출 라벨 "다음 단계로 →"
 * - `variant="edit"` → 제출 라벨 "저장"
 * - `action` 은 Server Action (FormData → Promise<void>) 만 받는다.
 *   (CLAUDE.md §8 — Server → Client function prop 은 Server Action 만 허용)
 */
export type OnboardingProfileFormDefaults = Partial<{
  name: string;
  gender: string;
  preferred_gender: string;
  recommender_name: string;
  recommender_relation: string;
  birth_year: number | null;
  region: string | null;
  region_detail: string | null;
  hometown: string | null;
  hometown_detail: string | null;
  occupation: string | null;
  instagram: string | null;
  relationship_status: string | null;
  match_interest: string | null;
  // 009 — 자기 보고 4 항목
  smoking: string | null;
  drinking: string | null;
  marriage_view: string | null;
  tattoo: string | null;
}>;

export function OnboardingProfileForm({
  action,
  defaultValues,
  variant = "onboarding",
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: OnboardingProfileFormDefaults;
  variant?: "onboarding" | "edit";
}) {
  const dv = defaultValues ?? {};
  const [showOptional, setShowOptional] = React.useState(
    !!(
      dv.birth_year ||
      dv.region ||
      dv.hometown ||
      dv.occupation ||
      dv.instagram ||
      dv.relationship_status ||
      dv.match_interest ||
      dv.smoking ||
      dv.drinking ||
      dv.marriage_view ||
      dv.tattoo
    ),
  );
  // 012 §D5 — 거주/출신 region cascade (region 선택 시 detail Select 등장).
  // controlled state — region 바뀌면 detail 자동 초기화 (cascade 정합).
  const [region, setRegion] = React.useState<string>(dv.region ?? "");
  const [regionDetail, setRegionDetail] = React.useState<string>(
    dv.region_detail ?? "",
  );
  const [hometown, setHometown] = React.useState<string>(dv.hometown ?? "");
  const [hometownDetail, setHometownDetail] = React.useState<string>(
    dv.hometown_detail ?? "",
  );
  const regionDetails = region
    ? REGION_DETAIL_OPTIONS[region as RegionCode] ?? []
    : [];
  const hometownDetails = hometown
    ? REGION_DETAIL_OPTIONS[hometown as RegionCode] ?? []
    : [];

  return (
    <form action={action} className="space-y-4">
      <FormSection title="필수 정보" subtitle="이거 5개만 있어도 다음 단계로!">
        <Field label="이름" htmlFor="name" required hint="실명 또는 자주 쓰는 별명">
          <Input
            id="name"
            name="name"
            defaultValue={dv.name ?? ""}
            placeholder="김민수"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="성별" htmlFor="gender" required>
            <Select
              id="gender"
              name="gender"
              defaultValue={dv.gender ?? "female"}
              required
            >
              <option value="female">여</option>
              <option value="male">남</option>
              <option value="other">기타</option>
            </Select>
          </Field>
          <Field label="선호 성별" htmlFor="preferred_gender" required>
            <Select
              id="preferred_gender"
              name="preferred_gender"
              defaultValue={dv.preferred_gender ?? "any"}
              required
            >
              <option value="any">상관없음</option>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </Select>
          </Field>
        </div>

        <Field
          label="추천인 이름"
          htmlFor="recommender_name"
          required={variant === "onboarding"}
          hint={
            variant === "edit"
              ? "변경하려면 운영자에게 문의해주세요"
              : "운영자가 아는 분의 이름을 적어주세요"
          }
        >
          <Input
            id="recommender_name"
            name="recommender_name"
            defaultValue={dv.recommender_name ?? ""}
            placeholder="김영희"
            required={variant === "onboarding"}
            readOnly={variant === "edit"}
            disabled={variant === "edit"}
          />
        </Field>
        <Field
          label="추천인 관계"
          htmlFor="recommender_relation"
          required={variant === "onboarding"}
          hint={
            variant === "edit"
              ? "변경하려면 운영자에게 문의해주세요"
              : "예: 대학 동기, 회사 선배, 동아리 친구"
          }
        >
          <Input
            id="recommender_relation"
            name="recommender_relation"
            defaultValue={dv.recommender_relation ?? ""}
            placeholder="대학 동기"
            required={variant === "onboarding"}
            readOnly={variant === "edit"}
            disabled={variant === "edit"}
          />
        </Field>
      </FormSection>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-xs text-pink-400 hover:text-pink-300"
      >
        {showOptional ? "− 추가 정보 접기" : "＋ 추가 정보 펼치기 (선택)"}
      </button>

      {showOptional ? (
        <>
          <FormSection
            title="기본 정보"
            subtitle="비워둬도 괜찮아요. 채울수록 매칭 정확도가 올라가요 💞"
          >
            <Field label="출생 연도" htmlFor="birth_year">
              <Input
                id="birth_year"
                name="birth_year"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={dv.birth_year ?? ""}
                placeholder="예: 1995"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="거주 지역" htmlFor="region">
                <Select
                  id="region"
                  name="region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setRegionDetail("");
                  }}
                >
                  <option value="">선택 안 함</option>
                  {REGION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="출신 지역" htmlFor="hometown">
                <Select
                  id="hometown"
                  name="hometown"
                  value={hometown}
                  onChange={(e) => {
                    setHometown(e.target.value);
                    setHometownDetail("");
                  }}
                >
                  <option value="">선택 안 함</option>
                  {REGION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {/* 012 §D5 — region cascade: 광역 선택 후 detail 옵션이 있으면 */}
            {regionDetails.length > 0 || hometownDetails.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {regionDetails.length > 0 ? (
                  <Field label="거주 세부 (구·시)" htmlFor="region_detail">
                    <Select
                      id="region_detail"
                      name="region_detail"
                      value={regionDetail}
                      onChange={(e) => setRegionDetail(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      {regionDetails.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <div />
                )}
                {hometownDetails.length > 0 ? (
                  <Field label="출신 세부 (구·시)" htmlFor="hometown_detail">
                    <Select
                      id="hometown_detail"
                      name="hometown_detail"
                      value={hometownDetail}
                      onChange={(e) => setHometownDetail(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      {hometownDetails.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <div />
                )}
              </div>
            ) : null}
            <Field label="직업" htmlFor="occupation">
              <Select
                id="occupation"
                name="occupation"
                defaultValue={dv.occupation ?? ""}
              >
                <option value="">선택 안 함</option>
                {JOB_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="연애 정보">
            <div className="grid grid-cols-2 gap-3">
              <Field label="연애 상태" htmlFor="relationship_status">
                <Select
                  id="relationship_status"
                  name="relationship_status"
                  defaultValue={dv.relationship_status ?? ""}
                >
                  <option value="">선택 안 함</option>
                  <option value="single">싱글</option>
                  <option value="complicated">복잡함</option>
                </Select>
              </Field>
              <Field label="매칭 관심도" htmlFor="match_interest">
                <Select
                  id="match_interest"
                  name="match_interest"
                  defaultValue={dv.match_interest ?? ""}
                >
                  <option value="">선택 안 함</option>
                  <option value="high">적극</option>
                  <option value="medium">보통</option>
                  <option value="low">소극</option>
                </Select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="라이프스타일"
            subtitle="안 적어도 OK, 다만 매칭 정확도 ↑ — 이상형 비교에 직접 쓰여요"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="흡연" htmlFor="smoking">
                <Select
                  id="smoking"
                  name="smoking"
                  defaultValue={dv.smoking ?? ""}
                >
                  <option value="">선택 안 함</option>
                  {SELF_SMOKING_OPTIONS.map((o) => (
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
                  defaultValue={dv.drinking ?? ""}
                >
                  <option value="">선택 안 함</option>
                  {SELF_DRINKING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="결혼관" htmlFor="marriage_view">
                <Select
                  id="marriage_view"
                  name="marriage_view"
                  defaultValue={dv.marriage_view ?? ""}
                >
                  <option value="">선택 안 함</option>
                  {SELF_MARRIAGE_VIEW_OPTIONS.map((o) => (
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
                  defaultValue={dv.tattoo ?? ""}
                >
                  <option value="">선택 안 함</option>
                  {SELF_TATTOO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="연락처"
            subtitle="운영자만 보고, 매칭 진행 시점에 양쪽 동의 하에만 공유돼요"
          >
            <Field label="인스타그램" htmlFor="instagram">
              <Input
                id="instagram"
                name="instagram"
                defaultValue={dv.instagram ?? ""}
                placeholder="@username"
              />
            </Field>
          </FormSection>
        </>
      ) : null}

      <Button size="lg" type="submit" className="w-full">
        {variant === "edit" ? "저장" : "다음 단계로 →"}
      </Button>
      {variant === "onboarding" ? (
        <p className="text-center text-[11px] text-[var(--color-fg-subtle)]">
          가입 직후 심사 대기 상태가 돼요. 운영자가 검토하면 알려드릴게요.
        </p>
      ) : null}
    </form>
  );
}
