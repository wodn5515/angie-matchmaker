/**
 * D2 — `upsertFriendIdealAggregate` 가 단일 RPC 호출로 전환됐는지 검증.
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D2
 *
 * 기존 구현은 5개 1:N 테이블에 각각 delete+insert + 1:1 upsert 를 순차 호출 (총 11 RTT)
 * — Supabase JS 가 client 측 트랜잭션을 지원하지 않아 부분 실패 시 데이터 손상 가능성.
 *
 * worker 가 채울 인터페이스 (lib/db/ideals.ts):
 *   - `upsertFriendIdealAggregate` 외부 signature 유지 (호출 측 영향 없음)
 *   - 내부 구현은 `supabase.rpc("upsert_friend_ideal_aggregate", { ... })` 한 번으로 통합
 *
 * 이 spec 은 mock supabase client 로 호출 패턴만 검증 (실제 DB 없이).
 * 외부 동작 보존: 기존 lib/db/ideals.ts 의 1:N replace + 1:1 upsert 순차 호출이
 * 더 이상 없어야 한다 (mock 의 from(...).delete/insert/upsert spy 가 호출되지 않음).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { upsertFriendIdealAggregate } from "@/lib/db/ideals";

type SupabaseMock = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  // recorded spies for assertions
  deleteSpy: ReturnType<typeof vi.fn>;
  insertSpy: ReturnType<typeof vi.fn>;
  upsertSpy: ReturnType<typeof vi.fn>;
};

function mockSupabase(): SupabaseMock {
  const deleteSpy = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  const insertSpy = vi.fn().mockResolvedValue({ error: null });
  const upsertSpy = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn(() => ({
    delete: deleteSpy,
    insert: insertSpy,
    upsert: upsertSpy,
  }));
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const sb = { rpc, from, deleteSpy, insertSpy, upsertSpy } as SupabaseMock;
  (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    sb,
  );
  return sb;
}

const SAMPLE_INPUT = {
  friendId: "friend-1",
  age_from: 28,
  age_to: 35,
  hometown_same_bonus: true,
  smoking: "non_smoker_only",
  drinking: "sometimes_only",
  marriage_timing: "within_2y",
  tattoo: "small_ok",
  free_text: "센스 있는 분이면 좋겠어요",
  regions: ["seoul", "gyeonggi"],
  hometowns: ["busan"],
  jobs: ["it", "design"],
  personality_keywords: ["calm", "curious", "humorous"],
  priorities: ["personality", "values", "stability"],
};

describe("upsertFriendIdealAggregate — RPC 단일 호출 통합 (D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RPC `upsert_friend_ideal_aggregate` 가 1번 호출된다", async () => {
    const sb = mockSupabase();
    await upsertFriendIdealAggregate(SAMPLE_INPUT);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith(
      "upsert_friend_ideal_aggregate",
      expect.any(Object),
    );
  });

  it("RPC 페이로드에 friend_id 와 1:N 5개 + 1:1 필드가 모두 들어간다", async () => {
    const sb = mockSupabase();
    await upsertFriendIdealAggregate(SAMPLE_INPUT);
    const payload = sb.rpc.mock.calls[0][1] as Record<string, unknown>;
    // friend_id 는 어떤 키 이름이든 친구 식별자가 전달돼야 한다 — 가장 흔한 후보들
    const friendIdKeyCandidates = ["p_friend_id", "in_friend_id", "friend_id"];
    expect(
      friendIdKeyCandidates.some((k) => payload[k] === SAMPLE_INPUT.friendId),
    ).toBe(true);

    // 1:N 배열 5개가 어떤 형태로든 페이로드에 들어가야 한다 (키 이름은 worker 자율).
    const valuesJson = JSON.stringify(payload);
    expect(valuesJson).toContain("seoul");
    expect(valuesJson).toContain("gyeonggi");
    expect(valuesJson).toContain("busan");
    expect(valuesJson).toContain("design");
    expect(valuesJson).toContain("curious");
    expect(valuesJson).toContain("personality");
  });

  it("기존 1:N 테이블 순차 delete+insert + 1:1 upsert 직접 호출은 더 이상 없다", async () => {
    const sb = mockSupabase();
    await upsertFriendIdealAggregate(SAMPLE_INPUT);
    // 모든 작업은 RPC 안에서 일어나므로 client 측 from(table).delete/insert/upsert 는 없어야 한다.
    expect(sb.deleteSpy).not.toHaveBeenCalled();
    expect(sb.insertSpy).not.toHaveBeenCalled();
    expect(sb.upsertSpy).not.toHaveBeenCalled();
  });

  it("RPC 가 에러를 반환하면 throw 한다", async () => {
    const sb = mockSupabase();
    sb.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });
    await expect(upsertFriendIdealAggregate(SAMPLE_INPUT)).rejects.toBeTruthy();
  });
});
