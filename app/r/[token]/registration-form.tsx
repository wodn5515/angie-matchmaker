"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import {
  GENDER_LABEL,
  PREFERRED_GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
} from "@/lib/types/domain";
import { submitRegistrationAction } from "./actions";

export function RegistrationForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(true);

  // Local state for form fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("female");
  const [preferredGender, setPreferredGender] = useState<string>("any");
  const [birthYear, setBirthYear] = useState<string>("");
  const [region, setRegion] = useState("");
  const [occupation, setOccupation] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [matchInterest, setMatchInterest] = useState("");
  const [instagram, setInstagram] = useState("");
  const [kakaoId, setKakaoId] = useState("");
  const [phone, setPhone] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitRegistrationAction({
        token,
        name,
        gender,
        preferred_gender: preferredGender,
        birth_year: birthYear,
        region,
        occupation,
        instagram,
        kakao_id: kakaoId,
        phone,
        relationship_status: relationshipStatus,
        match_interest: matchInterest,
      });
      if (!res.ok) {
        if (res.reason === "already_used" || res.reason === "not_found") {
          router.replace(`/r/${token}/expired`);
          return;
        }
        setError(res.message ?? "등록에 실패했어요. 다시 시도해주세요.");
        return;
      }
      router.replace(`/r/${token}/done?name=${encodeURIComponent(name)}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <Section title="필수 정보" subtitle="이거 3개만 있어도 등록돼!">
        <div className="grid gap-3">
          <div>
            <Label required htmlFor="name">
              이름
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="원하는 이름이나 별명"
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required htmlFor="gender">
                성별
              </Label>
              <Select
                id="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={pending}
              >
                {(
                  Object.keys(GENDER_LABEL) as Array<keyof typeof GENDER_LABEL>
                ).map((k) => (
                  <option key={k} value={k}>
                    {GENDER_LABEL[k]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label required htmlFor="preferred_gender">
                선호 성별
              </Label>
              <Select
                id="preferred_gender"
                required
                value={preferredGender}
                onChange={(e) => setPreferredGender(e.target.value)}
                disabled={pending}
              >
                {(
                  Object.keys(PREFERRED_GENDER_LABEL) as Array<
                    keyof typeof PREFERRED_GENDER_LABEL
                  >
                ).map((k) => (
                  <option key={k} value={k}>
                    {PREFERRED_GENDER_LABEL[k]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Section>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-xs text-pink-400 hover:text-pink-300"
      >
        {showOptional ? "− 추가 정보 접기" : "＋ 추가 정보 펼치기 (선택)"}
      </button>

      {showOptional ? (
        <>
          <Section
            title="기본 정보"
            subtitle="비워둬도 괜찮아. 더 정확하게 매칭하려면 채워줘 💞"
          >
            <div className="grid gap-3">
              <div>
                <Label htmlFor="birth_year">출생 연도</Label>
                <Input
                  id="birth_year"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="예: 1995"
                  disabled={pending}
                />
              </div>
              <div>
                <Label htmlFor="region">거주 지역</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="서울 강남구"
                  disabled={pending}
                />
              </div>
              <div>
                <Label htmlFor="occupation">직업</Label>
                <Input
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="디자이너"
                  disabled={pending}
                />
              </div>
            </div>
          </Section>

          <Section title="연애 정보">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="relationship_status">연애 상태</Label>
                <Select
                  id="relationship_status"
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
                  disabled={pending}
                >
                  <option value="">선택 안 함</option>
                  {(
                    Object.keys(RELATIONSHIP_STATUS_LABEL) as Array<
                      keyof typeof RELATIONSHIP_STATUS_LABEL
                    >
                  ).map((k) => (
                    <option key={k} value={k}>
                      {RELATIONSHIP_STATUS_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="match_interest">매칭 관심도</Label>
                <Select
                  id="match_interest"
                  value={matchInterest}
                  onChange={(e) => setMatchInterest(e.target.value)}
                  disabled={pending}
                >
                  <option value="">선택 안 함</option>
                  {(
                    Object.keys(MATCH_INTEREST_LABEL) as Array<
                      keyof typeof MATCH_INTEREST_LABEL
                    >
                  ).map((k) => (
                    <option key={k} value={k}>
                      {MATCH_INTEREST_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Section>

          <Section
            title="연락처"
            subtitle="운영자만 보고, 매칭 후보랑 공유 시점은 운영자가 따로 정해."
          >
            <div className="grid gap-3">
              <div>
                <Label htmlFor="instagram">인스타그램</Label>
                <Input
                  id="instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@username"
                  disabled={pending}
                />
              </div>
              <div>
                <Label htmlFor="kakao_id">카카오톡 ID</Label>
                <Input
                  id="kakao_id"
                  value={kakaoId}
                  onChange={(e) => setKakaoId(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <Label htmlFor="phone">전화</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-..."
                  disabled={pending}
                />
              </div>
            </div>
          </Section>
        </>
      ) : null}

      {error ? (
        <p className="text-center text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <Button size="lg" type="submit" className="w-full" disabled={pending}>
        {pending ? "등록 중…" : "💞 등록하기"}
      </Button>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-sm px-4 py-4">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
