"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FormSection } from "@/components/ui/field";
import { REGION_OPTIONS, JOB_OPTIONS } from "@/lib/types/v2-options";

/**
 * V2 온보딩 Step 1 폼 (가입자 기본 정보).
 *
 * 디자이너 골격: 필수 4 + 권장 9 필드. 권장 묶음은 접기/펼치기로 가벼움 유지.
 *
 * TODO(worker, task-B):
 *  - `"use server"` action 으로 submit 처리 (예: `submitOnboardingProfileAction`)
 *  - 폼 검증 (이름·성별·선호 성별·추천인 4개 필수), 실패 시 에러 표시
 *  - 제출 성공 시 server-side redirect 로 `/onboarding/preferences`
 *  - 디자이너는 폼 자체 동작 (controlled state) 만 잡고, 서버 통신은 비워둠
 */
export function OnboardingProfileForm() {
  const [showOptional, setShowOptional] = React.useState(true);
  // controlled state — server action 도입 시 그대로 FormData 로 전달 가능
  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState("female");
  const [preferredGender, setPreferredGender] = React.useState("any");
  const [recommenderName, setRecommenderName] = React.useState("");
  const [recommenderRelation, setRecommenderRelation] = React.useState("");

  const [birthYear, setBirthYear] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [hometown, setHometown] = React.useState("");
  const [occupation, setOccupation] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [relationshipStatus, setRelationshipStatus] = React.useState("");
  const [matchInterest, setMatchInterest] = React.useState("");

  return (
    <form
      // TODO(worker): action={submitOnboardingProfileAction}
      action="#todo-server-action"
      className="space-y-4"
    >
      <FormSection title="필수 정보" subtitle="이거 4개만 있어도 다음 단계로!">
        <Field label="이름" htmlFor="name" required hint="실명 또는 자주 쓰는 별명">
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="김민수"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="성별" htmlFor="gender" required>
            <Select
              id="gender"
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
              value={preferredGender}
              onChange={(e) => setPreferredGender(e.target.value)}
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
            value={recommenderName}
            onChange={(e) => setRecommenderName(e.target.value)}
            placeholder="김영희"
            required
          />
        </Field>
        <Field
          label="어떻게 아는 분이세요?"
          htmlFor="recommender_relation"
          required
          hint="예: 대학 동기, 회사 선배, 동아리 친구"
        >
          <Input
            id="recommender_relation"
            name="recommender_relation"
            value={recommenderRelation}
            onChange={(e) => setRecommenderRelation(e.target.value)}
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
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="예: 1995"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="거주 지역" htmlFor="region">
                <Select
                  id="region"
                  name="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
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
                  onChange={(e) => setHometown(e.target.value)}
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
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
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
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
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
                  value={matchInterest}
                  onChange={(e) => setMatchInterest(e.target.value)}
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
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
              />
            </Field>
          </FormSection>
        </>
      ) : null}

      <Button size="lg" type="submit" className="w-full">
        다음 단계로 →
      </Button>
      <p className="text-center text-[11px] text-[var(--color-fg-subtle)]">
        가입 직후 심사 대기 상태가 돼요. 운영자가 검토하면 알려드릴게요.
      </p>
    </form>
  );
}
