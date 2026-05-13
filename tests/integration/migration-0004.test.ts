/**
 * D2, D5 — 마이그레이션 0004_v2_1_followup.sql 정합 테스트 (SQL 텍스트 파싱).
 *
 * 결정 로그: docs/decisions/007-v2-1-review-followup.md §D2, §D5
 *
 * Lead 판단: migration-0003.test.ts 와 동일하게 실제 Supabase / 도커 Postgres 의존 없이
 * SQL 텍스트 검색으로 마이그레이션 정합을 검증한다 (이유는 0003 spec 헤더 참고).
 *
 * worker 가 작성할 파일:
 *   supabase/migrations/0004_v2_1_followup.sql
 *
 * 이 spec 은 다음을 검증:
 *   1. (D2) `upsert_friend_ideal_aggregate(...)` PL/pgSQL function 생성
 *      - `CREATE OR REPLACE FUNCTION` 으로 정의
 *      - language plpgsql
 *      - 5+1 테이블 모두 처리 (friend_ideals + 1:N 5개)
 *      - delete → insert 흐름 (1:N replace 패턴)
 *      - friend_ideals 는 upsert / on conflict
 *   2. (D5) 0003 마이그레이션 멱등성 가드 보강
 *      - `drop column if exists` 형태로 0003 의 4개 V1 컬럼(closeness/how_we_met/kakao_id/phone)을
 *        재실행해도 안전하게 한 번 더 가드 (fresh install 시 멱등성 회복)
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/0004_v2_1_followup.sql",
);

let sql = "";

beforeAll(() => {
  if (!existsSync(MIGRATION_PATH)) {
    sql = "";
    return;
  }
  sql = readFileSync(MIGRATION_PATH, "utf-8").toLowerCase();
});

describe("0004_v2_1_followup.sql — V2.1 후속 정합 (D2/D5)", () => {
  it("마이그레이션 파일이 존재한다", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("D2. upsert_friend_ideal_aggregate RPC function", () => {
    it("`CREATE OR REPLACE FUNCTION upsert_friend_ideal_aggregate(...)` 정의가 존재", () => {
      expect(sql).toMatch(
        /create\s+or\s+replace\s+function\s+upsert_friend_ideal_aggregate/,
      );
    });

    it("language plpgsql 로 정의", () => {
      expect(sql).toMatch(/language\s+plpgsql/);
    });

    it("function 본문에 friend_ideals 1:1 upsert 가 포함된다", () => {
      // friend_ideals 테이블 처리 — insert/upsert/on conflict 어떤 형태든 등장해야 함
      expect(sql).toMatch(/friend_ideals/);
      // ON CONFLICT 또는 인서트 후 update 패턴 중 하나
      const hasUpsert =
        /on\s+conflict[\s\S]*?friend_id/.test(sql) ||
        /insert\s+into\s+friend_ideals/.test(sql);
      expect(hasUpsert).toBe(true);
    });

    it("function 본문이 1:N 5 테이블을 모두 처리한다", () => {
      expect(sql).toMatch(/friend_ideal_regions/);
      expect(sql).toMatch(/friend_ideal_hometowns/);
      expect(sql).toMatch(/friend_ideal_jobs/);
      expect(sql).toMatch(/friend_ideal_personality_keywords/);
      expect(sql).toMatch(/friend_ideal_priorities/);
    });

    it("1:N 테이블은 delete → insert (replace) 패턴", () => {
      // function 안에서 1:N 테이블에 대해 delete 가 일어나야 한다
      // (전체 friend_id 의 row 들을 지우고 새로 insert 하는 형태)
      expect(sql).toMatch(/delete\s+from\s+friend_ideal_regions/);
      expect(sql).toMatch(/delete\s+from\s+friend_ideal_hometowns/);
      expect(sql).toMatch(/delete\s+from\s+friend_ideal_jobs/);
      expect(sql).toMatch(/delete\s+from\s+friend_ideal_personality_keywords/);
      expect(sql).toMatch(/delete\s+from\s+friend_ideal_priorities/);
    });

    it("function returns void (또는 비등가 반환형 없이 단순 절차형)", () => {
      // returns void 또는 returns trigger 처럼 명시되어야 함 — 가장 정석은 void
      expect(sql).toMatch(/returns\s+void/);
    });

    it("function 시그니처에 friend_id (uuid) 파라미터가 있다", () => {
      // 최소한 첫 인자는 친구 id — uuid 타입 또는 in_friend_id 같은 명시적 이름
      expect(sql).toMatch(/upsert_friend_ideal_aggregate\s*\([\s\S]*?uuid/);
    });
  });

  describe("D5. 0003 V1 컬럼 DROP 멱등성 가드 보강", () => {
    // 0003 의 alter table ... drop column closeness 등은 if exists 부재.
    // 0004 가 다시 같은 컬럼을 drop column if exists 형태로 재실행 가능하게 한 번 더 가드.
    it("closeness 에 대한 drop column if exists 가드", () => {
      expect(sql).toMatch(/drop\s+column\s+if\s+exists\s+closeness/);
    });

    it("how_we_met 에 대한 drop column if exists 가드", () => {
      expect(sql).toMatch(/drop\s+column\s+if\s+exists\s+how_we_met/);
    });

    it("kakao_id 에 대한 drop column if exists 가드", () => {
      expect(sql).toMatch(/drop\s+column\s+if\s+exists\s+kakao_id/);
    });

    it("phone 에 대한 drop column if exists 가드", () => {
      expect(sql).toMatch(/drop\s+column\s+if\s+exists\s+phone/);
    });
  });
});
