"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Friend } from "@/lib/types/domain";
import {
  GENDER_LABEL,
  PREFERRED_GENDER_LABEL,
  RELATIONSHIP_STATUS_LABEL,
  MATCH_INTEREST_LABEL,
} from "@/lib/types/domain";

type ActionFn = (
  formData: FormData,
) => Promise<{ ok: true; friendId: string } | { ok: false; error: string }>;

export function FriendForm({
  initial,
  action,
  submitLabel = "저장",
  redirectAfter,
}: {
  initial?: Partial<Friend>;
  action: ActionFn;
  submitLabel?: string;
  redirectAfter?: (friendId: string) => string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showOptional, setShowOptional] = useState<boolean>(
    !!(
      initial?.birth_year ||
      initial?.region ||
      initial?.occupation ||
      initial?.tags?.length ||
      initial?.instagram ||
      initial?.kakao_id ||
      initial?.notes
    ),
  );
  const router = useRouter();

  const tagsCsv = (initial?.tags ?? []).join(", ");

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const target = redirectAfter
        ? redirectAfter(res.friendId)
        : `/friends/${res.friendId}`;
      router.push(target);
    });
  };

  return (
    <form action={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>필수 정보</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label required htmlFor="name">
              이름 / 별명
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder="민수"
            />
          </div>
          <div>
            <Label required htmlFor="gender">
              성별
            </Label>
            <Select id="gender" name="gender" required defaultValue={initial?.gender ?? "female"}>
              {(Object.keys(GENDER_LABEL) as Array<keyof typeof GENDER_LABEL>).map((k) => (
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
              name="preferred_gender"
              required
              defaultValue={initial?.preferred_gender ?? "any"}
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
        </CardBody>
      </Card>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-xs text-pink-400 hover:text-pink-300"
      >
        {showOptional ? "− 선택 정보 접기" : "＋ 선택 정보 펼치기"}
      </button>

      {showOptional ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>기본 정보 (Tier 2)</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="birth_year">출생 연도</Label>
                <Input
                  id="birth_year"
                  name="birth_year"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  defaultValue={initial?.birth_year ?? ""}
                  placeholder="예: 1995"
                />
              </div>
              <div>
                <Label htmlFor="region">거주 지역</Label>
                <Input
                  id="region"
                  name="region"
                  defaultValue={initial?.region ?? ""}
                  placeholder="서울 강남구"
                />
              </div>
              <div>
                <Label htmlFor="occupation">직업</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  defaultValue={initial?.occupation ?? ""}
                  placeholder="디자이너"
                />
              </div>
              <div>
                <Label htmlFor="closeness">친밀도 (1~5)</Label>
                <Select
                  id="closeness"
                  name="closeness"
                  defaultValue={initial?.closeness ?? ""}
                >
                  <option value="">선택 안 함</option>
                  <option value="1">1 — 거의 모름</option>
                  <option value="2">2 — 가끔 봄</option>
                  <option value="3">3 — 보통</option>
                  <option value="4">4 — 친함</option>
                  <option value="5">5 — 매우 친함</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="how_we_met">어떻게 알게 됐는지</Label>
                <Input
                  id="how_we_met"
                  name="how_we_met"
                  defaultValue={initial?.how_we_met ?? ""}
                  placeholder="대학 동아리"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="tags_csv">태그 (쉼표로 구분)</Label>
                <Input
                  id="tags_csv"
                  name="tags_csv"
                  defaultValue={tagsCsv}
                  placeholder="대학동기, 디자이너, ENFJ"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>연락처 / 메모 (Tier 3)</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="instagram">인스타그램</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  defaultValue={initial?.instagram ?? ""}
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="kakao_id">카카오톡 ID</Label>
                <Input
                  id="kakao_id"
                  name="kakao_id"
                  defaultValue={initial?.kakao_id ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="phone">전화</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={initial?.phone ?? ""}
                  placeholder="010-..."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">자유 메모 (운영자만 봄)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={initial?.notes ?? ""}
                  placeholder="이 친구에 대한 인상, 특이사항 등"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>상태</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="relationship_status">연애 상태</Label>
                <Select
                  id="relationship_status"
                  name="relationship_status"
                  defaultValue={initial?.relationship_status ?? ""}
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
                  name="match_interest"
                  defaultValue={initial?.match_interest ?? ""}
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
            </CardBody>
          </Card>
        </>
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
