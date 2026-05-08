"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/input";

export function FriendsFilter({
  q,
  gender,
  mi,
}: {
  q: string;
  gender: string;
  mi: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/friends?${params.toString()}`);
  };

  return (
    <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
      <Input
        placeholder="이름·지역·태그 검색"
        defaultValue={q}
        onChange={(e) => setParam("q", e.currentTarget.value)}
      />
      <Select value={gender} onChange={(e) => setParam("gender", e.target.value)}>
        <option value="all">성별: 전체</option>
        <option value="female">여</option>
        <option value="male">남</option>
        <option value="other">기타</option>
      </Select>
      <Select value={mi} onChange={(e) => setParam("mi", e.target.value)}>
        <option value="all">매칭 관심도: 전체</option>
        <option value="high">적극</option>
        <option value="medium">보통</option>
        <option value="low">소극</option>
        <option value="none">관심 없음</option>
      </Select>
    </div>
  );
}
