"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Friend } from "@/lib/types/domain";

export function ComparePicker({
  friendId,
  otherFriends,
}: {
  friendId: string;
  otherFriends: Friend[];
}) {
  const router = useRouter();
  const [other, setOther] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>이 친구와 비교</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select value={other} onChange={(e) => setOther(e.target.value)}>
            <option value="">비교할 친구 선택…</option>
            {otherFriends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          disabled={!other}
          onClick={() => router.push(`/compare?a=${friendId}&b=${other}`)}
        >
          비교하기 →
        </Button>
      </CardBody>
    </Card>
  );
}
