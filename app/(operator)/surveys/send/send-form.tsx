"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Friend } from "@/lib/types/domain";
import { createInvitationAction } from "./actions";

type SurveyOption = { id: string; label: string; ready: boolean };

export function SendForm({
  friends,
  surveys,
  defaultFriendId,
  standardReady,
}: {
  friends: Friend[];
  surveys: SurveyOption[];
  defaultFriendId?: string;
  standardReady: boolean;
}) {
  const [friendId, setFriendId] = useState<string>(defaultFriendId ?? "");
  const [surveyId, setSurveyId] = useState<string>(
    surveys[0]?.ready ? surveys[0].id : "",
  );
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const friend = friends.find((f) => f.id === friendId) ?? null;
  const survey = surveys.find((s) => s.id === surveyId) ?? null;

  const generate = () => {
    setError(null);
    if (!friendId || !surveyId) {
      setError("친구와 설문을 모두 골라주세요");
      return;
    }
    if (survey && !survey.ready) {
      setError(
        "이 설문은 아직 챕터/문항이 없습니다. 먼저 설문 편집을 완료해주세요.",
      );
      return;
    }
    startTransition(async () => {
      try {
        const res = await createInvitationAction({ friendId, surveyId });
        setToken(res.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "발송 실패");
      }
    });
  };

  const link =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/s/${token}`
      : null;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  };

  const share = async () => {
    if (!link || !friend) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "설문",
          text: `${friend.name}, 설문에 답해줄래? 🎀`,
          url: link,
        });
      } catch {
        // user canceled
      }
    } else {
      copy();
    }
  };

  if (token && link) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>링크 발급 완료</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-[var(--color-fg-muted)]">
            아래 링크를 {friend?.name ?? "친구"}에게 카톡으로 보내주세요. 1회용
            링크라 응답 완료 후엔 만료됩니다.
          </p>
          <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 break-all text-sm text-pink-300">
            {link}
          </div>
          <div className="flex gap-2">
            <Button onClick={copy}>📋 복사</Button>
            <Button variant="secondary" onClick={share}>
              공유
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setToken(null);
                setSurveyId(surveys[0]?.ready ? surveys[0].id : "");
              }}
            >
              새로 발급
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>발송 정보</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label required>친구</Label>
          <Select value={friendId} onChange={(e) => setFriendId(e.target.value)}>
            <option value="">선택…</option>
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>설문</Label>
          <Select value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
            <option value="">선택…</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id} disabled={!s.ready}>
                {s.label}
                {!s.ready ? " (비어 있음)" : ""}
              </option>
            ))}
          </Select>
          {!standardReady ? (
            <p className="mt-1 text-[11px] text-[var(--color-warn)]">
              표준 설문이 비어 있어요. 먼저 챕터와 문항을 만들어주세요.
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={generate} disabled={pending}>
            {pending ? "생성 중…" : "링크 생성 →"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
