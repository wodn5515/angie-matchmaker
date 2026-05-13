"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Friend } from "@/lib/types/domain";
import { createCustomSurveyAction } from "@/app/(operator)/surveys/actions";

export function CustomSurveyForm({ friends }: { friends: Friend[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetFriendId, setTargetFriendId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      setError("제목은 필수입니다");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCustomSurveyAction({
          title: title.trim(),
          description: description.trim() || undefined,
          targetFriendId: targetFriendId || undefined,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>테스트 정보</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label required>제목</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 민수에게 추가로 묻고 싶은 것들"
          />
        </div>
        <div>
          <Label>설명 (선택)</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>대상 친구 (선택, 메모용)</Label>
          <Select
            value={targetFriendId}
            onChange={(e) => setTargetFriendId(e.target.value)}
          >
            <option value="">지정 안 함</option>
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
            대상은 자동 발송되지 않아요. 발송은 발송 페이지에서 따로 진행합니다.
          </p>
        </div>
        {error ? (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "생성 중…" : "다음 — 문항 만들기 →"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
