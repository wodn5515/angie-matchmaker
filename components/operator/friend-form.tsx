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
import {
  REGION_OPTIONS,
  JOB_OPTIONS,
  SELF_SMOKING_OPTIONS,
  SELF_DRINKING_OPTIONS,
  SELF_MARRIAGE_VIEW_OPTIONS,
  SELF_TATTOO_OPTIONS,
} from "@/lib/types/v2-options";

/**
 * V2 운영자 가입자 정보 수정 폼.
 *
 * V1 폐기 컬럼 제거 (closeness / how_we_met / kakao_id / phone). V2 신규 컬럼은
 * 가입자가 본인 입력하는 게 정석이지만, 운영자가 메모 / 태그 / 매칭 관심도 등을
 * 보강 편집할 수 있게 둔다. status / rejected_reason 은 ReviewActions 가 별도 처리.
 */
type ActionResult = { ok: true; friendId: string } | { ok: false; error: string };
type ActionFn = (formData: FormData) => Promise<ActionResult>;

export function FriendForm({
  initial,
  action,
  submitLabel = "저장",
}: {
  initial?: Partial<Friend>;
  action: ActionFn;
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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
      router.push(`/friends/${res.friendId}`);
    });
  };

  return (
    <form action={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label required htmlFor="name">
              이름
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
            <Select
              id="gender"
              name="gender"
              required
              defaultValue={initial?.gender ?? "female"}
            >
              {(Object.keys(GENDER_LABEL) as Array<keyof typeof GENDER_LABEL>).map(
                (k) => (
                  <option key={k} value={k}>
                    {GENDER_LABEL[k]}
                  </option>
                ),
              )}
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

      <Card>
        <CardHeader>
          <CardTitle>추천인</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="recommender_name">추천인 이름</Label>
            <Input
              id="recommender_name"
              name="recommender_name"
              defaultValue={initial?.recommender_name ?? ""}
              placeholder="김영희"
            />
          </div>
          <div>
            <Label htmlFor="recommender_relation">관계</Label>
            <Input
              id="recommender_relation"
              name="recommender_relation"
              defaultValue={initial?.recommender_relation ?? ""}
              placeholder="대학 동기"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>권장 정보</CardTitle>
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
            <Select
              id="region"
              name="region"
              defaultValue={initial?.region ?? ""}
            >
              <option value="">선택 안 함</option>
              {REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hometown">출신 지역</Label>
            <Select
              id="hometown"
              name="hometown"
              defaultValue={initial?.hometown ?? ""}
            >
              <option value="">선택 안 함</option>
              {REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="occupation">직업</Label>
            <Select
              id="occupation"
              name="occupation"
              defaultValue={initial?.occupation ?? ""}
            >
              <option value="">선택 안 함</option>
              {JOB_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
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

      {/* 자기 보고 4 항목 (009) — 이상형 매칭 대칭. 운영자가 가입자 대신 보강 입력 가능 */}
      <Card>
        <CardHeader>
          <CardTitle>라이프스타일</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="smoking">흡연</Label>
            <Select
              id="smoking"
              name="smoking"
              defaultValue={initial?.smoking ?? ""}
            >
              <option value="">선택 안 함</option>
              {SELF_SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="drinking">음주</Label>
            <Select
              id="drinking"
              name="drinking"
              defaultValue={initial?.drinking ?? ""}
            >
              <option value="">선택 안 함</option>
              {SELF_DRINKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="marriage_view">결혼관</Label>
            <Select
              id="marriage_view"
              name="marriage_view"
              defaultValue={initial?.marriage_view ?? ""}
            >
              <option value="">선택 안 함</option>
              {SELF_MARRIAGE_VIEW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tattoo">문신</Label>
            <Select
              id="tattoo"
              name="tattoo"
              defaultValue={initial?.tattoo ?? ""}
            >
              <option value="">선택 안 함</option>
              {SELF_TATTOO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>운영자 메모</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div>
            <Label htmlFor="tags_csv">태그 (쉼표로 구분)</Label>
            <Input
              id="tags_csv"
              name="tags_csv"
              defaultValue={tagsCsv}
              placeholder="대학동기, 디자이너, ENFJ"
            />
          </div>
          <div>
            <Label htmlFor="notes">자유 메모 (운영자만 봄)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={initial?.notes ?? ""}
              placeholder="이 가입자에 대한 인상, 특이사항 등"
            />
          </div>
        </CardBody>
      </Card>

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
