"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Friend, Survey } from "@/lib/types/domain";
import {
  deleteCustomSurveyAction,
  updateCustomSurveyAction,
} from "@/app/(operator)/surveys/actions";

export function CustomSurveyMeta({
  survey,
  friends,
}: {
  survey: Survey;
  friends: Friend[];
}) {
  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? "");
  const [targetFriendId, setTargetFriendId] = useState<string>(
    survey.target_friend_id ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onSave = () => {
    startTransition(async () => {
      await updateCustomSurveyAction(survey.id, {
        title,
        description: description || null,
        targetFriendId: targetFriendId || null,
      });
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      await deleteCustomSurveyAction(survey.id);
    });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>설문 정보</CardTitle>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-fg-muted)]">
              삭제할까요?
            </span>
            <Button
              size="sm"
              variant="danger"
              onClick={onDelete}
              disabled={pending}
            >
              삭제
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
          >
            설문 삭제
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label>제목</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>설명</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>대상 친구 (메모용)</Label>
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
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
