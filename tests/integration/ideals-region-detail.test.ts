/**
 * 통합 — upsertFriendIdealAggregate / getFriendIdealAggregate 의 region_detail
 * 라운드트립 + RPC 결합 직렬화 패턴 ("region|detail") 검증.
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D2·§D7 + 마이그레이션 0006_region_detail.sql
 *
 * ## 검증 포인트
 *
 * 1. upsertFriendIdealAggregate(input) 가 RPC 호출 시 p_regions / p_hometowns 에
 *    "region|detail" 결합 문자열 배열을 보낸다 (D2).
 *
 * 2. getFriendIdealAggregate(friendId) 가 regions / hometowns 를
 *    [{region, region_detail}] / [{hometown, hometown_detail}] 형태 객체 배열로 리턴
 *    (기존 string[] → object[] 마이그레이션).
 *
 * 3. 라운드트립: upsert 입력 → load 출력 형태 일관.
 *
 * 4. 마이그레이션 0006_region_detail.sql 정합 (SQL 텍스트 파싱):
 *    - friends.region_detail / hometown_detail 추가 + CHECK
 *    - friend_ideal_regions.region_detail NOT NULL DEFAULT ''
 *    - PK (friend_id, region, region_detail) 재구성
 *    - friend_ideal_hometowns.hometown_detail NOT NULL DEFAULT '' 동일
 *    - 기존 데이터 백필 — DEFAULT '' 로 자연 보존 (D7)
 *
 * SQL 텍스트 검증은 0005 spec 패턴을 그대로 따른다 (CI 부담 없는 정적 단언).
 * mock supabase 호출 패턴 검증은 ideal-aggregate-rpc 패턴을 그대로 따른다.
 */

import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  upsertFriendIdealAggregate,
  getFriendIdealAggregate,
} from "@/lib/db/ideals";

// ─────────────────────────────────────────────────────────────
// §A. RPC payload 검증 — "region|detail" 결합 직렬화 (D2)
// ─────────────────────────────────────────────────────────────

type SupabaseMock = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
};

function mockSupabaseForUpsert(): SupabaseMock {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn(() => ({
    delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    insert: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }));

  const sb = { rpc, from } as SupabaseMock;
  (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    sb,
  );
  return sb;
}

function mockSupabaseForLoad(rows: {
  regions: Array<{ region: string; region_detail: string }>;
  hometowns: Array<{ hometown: string; hometown_detail: string }>;
}): SupabaseMock {
  // 각 from(table).select(...).eq(friend_id) 체이닝의 await 결과를 모킹.
  const builder = (data: unknown) => {
    const obj: Record<string, unknown> = {};
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data, error: null }).then(resolve),
    };
    Object.assign(obj, chain);
    return chain;
  };

  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn((table: string) => {
    if (table === "friend_ideal_regions") return builder(rows.regions);
    if (table === "friend_ideal_hometowns") return builder(rows.hometowns);
    if (table === "friend_ideals") return builder(null);
    if (table === "friend_ideal_jobs") return builder([]);
    if (table === "friend_ideal_personality_keywords") return builder([]);
    if (table === "friend_ideal_priorities") return builder([]);
    return builder([]);
  });
  const sb = { rpc, from } as SupabaseMock;
  (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    sb,
  );
  return sb;
}

const BASE_UPSERT_INPUT = {
  friendId: "friend-region-detail-1",
  age_from: 28,
  age_to: 35,
  hometown_same_bonus: false,
  smoking: null,
  drinking: null,
  marriage_timing: null,
  tattoo: null,
  free_text: null,
  jobs: [] as string[],
  personality_keywords: [] as string[],
  priorities: [] as string[],
};

describe("upsertFriendIdealAggregate — region_detail 결합 직렬화 (D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regions 가 [{seoul, gangnam-gu}] 단독이면 RPC payload 에 'seoul|gangnam-gu' 가 포함된다", async () => {
    const sb = mockSupabaseForUpsert();
    await upsertFriendIdealAggregate({
      ...BASE_UPSERT_INPUT,
      // worker 가 input 시그니처를 RegionDetailValue[] 로 마이그레이션한다.
      regions: [{ region: "seoul", detail: "gangnam-gu" }],
      hometowns: [],
    } as unknown as Parameters<typeof upsertFriendIdealAggregate>[0]);

    expect(sb.rpc).toHaveBeenCalledTimes(1);
    const payload = sb.rpc.mock.calls[0][1] as Record<string, unknown>;
    const json = JSON.stringify(payload);
    // 결합 형식 — "seoul|gangnam-gu"
    expect(json).toContain("seoul|gangnam-gu");
  });

  it("regions 가 [{seoul, ''}] (광역 전체) 이면 RPC payload 에 'seoul|' 가 포함된다", async () => {
    const sb = mockSupabaseForUpsert();
    await upsertFriendIdealAggregate({
      ...BASE_UPSERT_INPUT,
      regions: [{ region: "seoul", detail: "" }],
      hometowns: [],
    } as unknown as Parameters<typeof upsertFriendIdealAggregate>[0]);

    const payload = sb.rpc.mock.calls[0][1] as Record<string, unknown>;
    const json = JSON.stringify(payload);
    // 빈 detail → 'seoul|' (파이프 + 빈문자열)
    expect(json).toMatch(/"seoul\|"/);
  });

  it("hometowns 도 같은 결합 직렬화 패턴 — 'busan|haeundae-gu'", async () => {
    const sb = mockSupabaseForUpsert();
    await upsertFriendIdealAggregate({
      ...BASE_UPSERT_INPUT,
      regions: [],
      hometowns: [{ region: "busan", detail: "haeundae-gu" }],
    } as unknown as Parameters<typeof upsertFriendIdealAggregate>[0]);

    const payload = sb.rpc.mock.calls[0][1] as Record<string, unknown>;
    const json = JSON.stringify(payload);
    expect(json).toContain("busan|haeundae-gu");
  });

  it("regions 다중 — [{seoul,''}, {busan,haeundae-gu}] 둘 다 결합 직렬화", async () => {
    // 정책상 같은 region 의 ('') 와 (detail) 동시는 안 보내지만, 서로 다른 region 의
    // 다중은 자연 케이스.
    const sb = mockSupabaseForUpsert();
    await upsertFriendIdealAggregate({
      ...BASE_UPSERT_INPUT,
      regions: [
        { region: "seoul", detail: "" },
        { region: "busan", detail: "haeundae-gu" },
      ],
      hometowns: [],
    } as unknown as Parameters<typeof upsertFriendIdealAggregate>[0]);

    const payload = sb.rpc.mock.calls[0][1] as Record<string, unknown>;
    const json = JSON.stringify(payload);
    expect(json).toContain("seoul|");
    expect(json).toContain("busan|haeundae-gu");
  });
});

// ─────────────────────────────────────────────────────────────
// §B. getFriendIdealAggregate — return 타입 마이그레이션 (string[] → object[])
// ─────────────────────────────────────────────────────────────

describe("getFriendIdealAggregate — regions/hometowns 가 객체 배열로 리턴 (디자이너 게이트)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regions 가 [{region, region_detail}] 형태 객체 배열로 리턴된다", async () => {
    mockSupabaseForLoad({
      regions: [
        { region: "seoul", region_detail: "" },
        { region: "busan", region_detail: "haeundae-gu" },
      ],
      hometowns: [],
    });

    const out = await getFriendIdealAggregate("friend-region-detail-1");

    expect(Array.isArray(out.regions)).toBe(true);
    expect(out.regions.length).toBe(2);

    // 객체 형태 — { region, region_detail } 또는 worker 자율 키명 (region, detail 둘 다 허용)
    const first = out.regions[0] as unknown as {
      region: string;
      region_detail?: string;
      detail?: string;
    };
    expect(typeof first).toBe("object");
    expect(first.region).toBeTypeOf("string");
    // detail 키는 region_detail 또는 detail 둘 중 하나 존재 (worker 자율)
    const detailVal = first.region_detail ?? first.detail;
    expect(typeof detailVal).toBe("string");
  });

  it("hometowns 가 [{hometown, hometown_detail}] 형태 객체 배열로 리턴된다", async () => {
    mockSupabaseForLoad({
      regions: [],
      hometowns: [
        { hometown: "gyeonggi", hometown_detail: "" },
        { hometown: "jeju", hometown_detail: "jeju-si" },
      ],
    });

    const out = await getFriendIdealAggregate("friend-region-detail-1");

    expect(Array.isArray(out.hometowns)).toBe(true);
    expect(out.hometowns.length).toBe(2);

    const first = out.hometowns[0] as unknown as {
      hometown: string;
      hometown_detail?: string;
      detail?: string;
    };
    expect(typeof first).toBe("object");
    expect(first.hometown).toBeTypeOf("string");
    const detailVal = first.hometown_detail ?? first.detail;
    expect(typeof detailVal).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────
// §C. 마이그레이션 0006 SQL 텍스트 정합 (D2 + D7)
// ─────────────────────────────────────────────────────────────

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/0006_region_detail.sql",
);

let sql = "";

beforeAll(() => {
  sql = existsSync(MIGRATION_PATH)
    ? readFileSync(MIGRATION_PATH, "utf-8").toLowerCase()
    : "";
});

describe("0006_region_detail.sql — 마이그레이션 정합 (D2 + D7)", () => {
  it("마이그레이션 파일이 존재한다", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("friends — region_detail / hometown_detail 컬럼 추가", () => {
    it("friends.region_detail 컬럼 추가", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?region_detail/,
      );
    });

    it("friends.hometown_detail 컬럼 추가", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?hometown_detail/,
      );
    });

    it("CHECK 제약 — region_detail 있으면 region 도 있어야 한다 (D1)", () => {
      // region_detail is null or region is not null — 정확한 토큰 매칭이 아닌 키워드 cluster.
      // worker 가 줄바꿈/공백을 어떻게 쓰든 두 컬럼이 같은 check 안에 등장해야 한다.
      const matches = sql.match(
        /check\s*\([^)]*region_detail[^)]*region[^)]*\)/,
      );
      expect(matches).not.toBeNull();
    });

    it("CHECK 제약 — hometown_detail 있으면 hometown 도 있어야 한다", () => {
      const matches = sql.match(
        /check\s*\([^)]*hometown_detail[^)]*hometown[^)]*\)/,
      );
      expect(matches).not.toBeNull();
    });
  });

  describe("friend_ideal_regions / friend_ideal_hometowns — detail 컬럼 + PK 재구성", () => {
    it("friend_ideal_regions.region_detail 컬럼 NOT NULL DEFAULT '' (D1)", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friend_ideal_regions[\s\S]{0,200}?add\s+column[\s\S]{0,120}?region_detail/,
      );
      // NOT NULL DEFAULT '' 키워드
      const block = sql.match(
        /add\s+column\s+(?:if\s+not\s+exists\s+)?region_detail[^;]*/,
      );
      expect(block).not.toBeNull();
      expect(block?.[0]).toMatch(/not\s+null/);
      expect(block?.[0]).toMatch(/default\s+''/);
    });

    it("friend_ideal_regions PK 재구성 — (friend_id, region, region_detail)", () => {
      // primary key 토큰 + 세 컬럼명 동시 등장
      expect(sql).toMatch(
        /primary\s+key\s*\([^)]*friend_id[^)]*region[^)]*region_detail[^)]*\)/,
      );
    });

    it("friend_ideal_hometowns.hometown_detail 컬럼 NOT NULL DEFAULT ''", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friend_ideal_hometowns[\s\S]{0,200}?add\s+column[\s\S]{0,120}?hometown_detail/,
      );
      const block = sql.match(
        /add\s+column\s+(?:if\s+not\s+exists\s+)?hometown_detail[^;]*/,
      );
      expect(block).not.toBeNull();
      expect(block?.[0]).toMatch(/not\s+null/);
      expect(block?.[0]).toMatch(/default\s+''/);
    });

    it("friend_ideal_hometowns PK 재구성 — (friend_id, hometown, hometown_detail)", () => {
      expect(sql).toMatch(
        /primary\s+key\s*\([^)]*friend_id[^)]*hometown[^)]*hometown_detail[^)]*\)/,
      );
    });
  });

  describe("RPC upsert_friend_ideal_aggregate — split_part 분해 (D2)", () => {
    it("RPC 본문에 split_part('|') 가 등장해 'region|detail' 결합 문자열을 분해한다", () => {
      // worker 가 split_part 또는 string_to_array 둘 중 하나로 분해 가능.
      const hasSplit =
        /split_part\s*\([^)]*'\|'/.test(sql) ||
        /string_to_array\s*\([^)]*'\|'/.test(sql);
      expect(hasSplit).toBe(true);
    });

    it("upsert_friend_ideal_aggregate function 정의가 갱신된다 (drop+create 또는 create or replace)", () => {
      const hasDef =
        /create\s+or\s+replace\s+function\s+upsert_friend_ideal_aggregate/.test(
          sql,
        ) ||
        /create\s+function\s+upsert_friend_ideal_aggregate/.test(sql);
      expect(hasDef).toBe(true);
    });
  });

  describe("백필 무손실 (D7) — DEFAULT '' 로 기존 (friend_id, region) 보존", () => {
    it("0006 은 friend_ideal_regions 의 기존 데이터를 DELETE 하지 않는다", () => {
      // truncate / delete from friend_ideal_regions 가 본문에 없어야 한다.
      expect(sql).not.toMatch(/truncate\s+(?:table\s+)?friend_ideal_regions/);
      expect(sql).not.toMatch(/delete\s+from\s+friend_ideal_regions/);
    });

    it("0006 은 friend_ideal_hometowns 의 기존 데이터를 DELETE 하지 않는다", () => {
      expect(sql).not.toMatch(/truncate\s+(?:table\s+)?friend_ideal_hometowns/);
      expect(sql).not.toMatch(/delete\s+from\s+friend_ideal_hometowns/);
    });

    it("0006 은 friends 테이블을 DROP 하지 않는다", () => {
      expect(sql).not.toMatch(/drop\s+table[\s\S]{0,40}?friends\b/);
    });
  });
});
