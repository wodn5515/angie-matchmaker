"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FormSection } from "@/components/ui/field";
import { REGION_OPTIONS, JOB_OPTIONS } from "@/lib/types/v2-options";

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
  hometown: string | null;
  occupation: string | null;
  instagram: string | null;
  relationship_status: string | null;
  match_interest: string | null;
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
      dv.match_interest
    ),
  );

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
          required
          hint="운영자가 아는 분의 이름을 적어주세요"
        >
          <Input
            id="recommender_name"
            name="recommender_name"
            defaultValue={dv.recommender_name ?? ""}
            placeholder="김영희"
            required
          />
        </Field>
        <Field
          label="추천인 관계"
          htmlFor="recommender_relation"
          required
          hint="예: 대학 동기, 회사 선배, 동아리 친구"
        >
          <Input
            id="recommender_relation"
            name="recommender_relation"
            defaultValue={dv.recommender_relation ?? ""}
            placeholder="대학 동기"
            required
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
                  defaultValue={dv.region ?? ""}
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
                  defaultValue={dv.hometown ?? ""}
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
