"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Friend } from "@/lib/types/domain";

export function CompareSelector({ friends }: { friends: Friend[] }) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const ready = a && b && a !== b;

  return (
    <Card>
      <CardHeader>
        <CardTitle>친구 두 명 고르기</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">왼쪽 친구…</option>
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">오른쪽 친구…</option>
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        {a && b && a === b ? (
          <p className="text-xs text-[var(--color-warn)]">
            서로 다른 친구를 골라주세요.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            disabled={!ready}
            onClick={() => router.push(`/compare?a=${a}&b=${b}`)}
          >
            비교 →
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
