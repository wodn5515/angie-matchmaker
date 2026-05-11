"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createFriendInvitationAction } from "./actions";

export function CreateInviteForm({ appUrl }: { appUrl: string }) {
  const [hintName, setHintName] = useState("");
  const [hintNote, setHintNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = issued && appUrl ? `${appUrl}/r/${issued}` : null;

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createFriendInvitationAction({
        hintName: hintName.trim() || null,
        hintNote: hintNote.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setIssued(res.token);
      setHintName("");
      setHintNote("");
    });
  };

  const onCopy = async () => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = async () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "친구 등록 링크",
          text: "안녕! 본인 정보 좀 입력해줄 수 있어? 🎀",
          url: link,
        });
      } catch {
        // user canceled
      }
    } else {
      onCopy();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 등록 링크 만들기</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label>친구 메모용 별명 (선택)</Label>
          <Input
            value={hintName}
            onChange={(e) => setHintName(e.target.value)}
            placeholder="누구한테 보낼지 운영자가 기억하기 위한 이름"
            disabled={pending}
          />
          <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
            친구한테는 보이지 않아요. 여러 링크를 만들었을 때 누구한테 보낸 건지 운영자가 알아보려고.
          </p>
        </div>
        <div>
          <Label>메모 (선택)</Label>
          <Input
            value={hintNote}
            onChange={(e) => setHintNote(e.target.value)}
            placeholder="예: 대학 동기, 회사 후배"
            disabled={pending}
          />
        </div>

        {error ? (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}

        {link ? (
          <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 space-y-2">
            <p className="text-[11px] text-pink-300">새 링크가 만들어졌어요</p>
            <p className="break-all text-sm font-mono text-pink-200">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onCopy}>
                {copied ? "복사됨 ✓" : "📋 복사"}
              </Button>
              <Button size="sm" variant="secondary" onClick={onShare}>
                공유
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIssued(null);
                  setCopied(false);
                }}
              >
                다시 만들기
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? "만드는 중…" : "🔗 링크 만들기"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
