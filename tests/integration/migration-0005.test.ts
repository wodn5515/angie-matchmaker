/**
 * 마이그레이션 0005_friends_self_traits.sql 정합 테스트 (SQL 텍스트 파싱).
 *
 * 결정 로그: docs/decisions/009-v2-self-traits.md §D1
 *
 * Lead 판단: migration-0003/0004 과 동일하게 도커 Postgres / 실제 Supabase 의존 없이
 * SQL 텍스트 검색으로 마이그레이션 정합을 검증한다 (CI 부담 ↓, 정적 단언 가치 ↑).
 *
 * worker 가 작성할 파일:
 *   supabase/migrations/0005_friends_self_traits.sql
 *
 * 이 spec 은 다음을 검증:
 *   1. friends 테이블에 4 컬럼 추가 (smoking / drinking / marriage_view / tattoo)
 *   2. 각 컬럼 enum CHECK 제약 (이상형의 "상관없음 제외" 셋 + 자세함 ↑)
 *   3. 모두 nullable — 권장 입력 정책 (§3.1.2)
 *   4. 마이그레이션이 ALTER 만 사용해야 함 — 0003 / 0004 의 friends 정의 무손상
 *      (drop column 등으로 기존 컬럼/제약을 건드리지 않음)
 *   5. friend_ideals 1:1 테이블 정의는 0005 가 만지지 않음 (이상형 본인 분리)
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/0005_friends_self_traits.sql",
);

let sql = "";

beforeAll(() => {
  if (!existsSync(MIGRATION_PATH)) {
    sql = "";
    return;
  }
  sql = readFileSync(MIGRATION_PATH, "utf-8").toLowerCase();
});

describe("0005_friends_self_traits.sql — 본인 프로필 4 항목 추가 (D1)", () => {
  it("마이그레이션 파일이 존재한다", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("4 컬럼 ALTER TABLE friends ADD COLUMN", () => {
    it("smoking 컬럼이 friends 테이블에 추가된다", () => {
      // ALTER TABLE friends ADD COLUMN smoking ... (text 또는 enum)
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?smoking/,
      );
    });

    it("drinking 컬럼이 friends 테이블에 추가된다", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?drinking/,
      );
    });

    it("marriage_view 컬럼이 friends 테이블에 추가된다", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?marriage_view/,
      );
    });

    it("tattoo 컬럼이 friends 테이블에 추가된다", () => {
      expect(sql).toMatch(
        /alter\s+table\s+friends[\s\S]{0,200}?add\s+column[\s\S]{0,80}?tattoo/,
      );
    });
  });

  describe("CHECK 제약 — 각 컬럼 enum 값 셋", () => {
    it("smoking IN ('non_smoker','occasional','regular')", () => {
      expect(sql).toMatch(/'non_smoker'/);
      expect(sql).toMatch(/'occasional'/);
      expect(sql).toMatch(/'regular'/);
    });

    it("drinking IN ('non_drinker','sometimes','often')", () => {
      expect(sql).toMatch(/'non_drinker'/);
      expect(sql).toMatch(/'sometimes'/);
      expect(sql).toMatch(/'often'/);
    });

    it("marriage_view IN ('within_2y','over_3y','dating_focus')", () => {
      expect(sql).toMatch(/'within_2y'/);
      expect(sql).toMatch(/'over_3y'/);
      expect(sql).toMatch(/'dating_focus'/);
    });

    it("tattoo IN ('none','small','large')", () => {
      // 0003 의 friend_ideals.tattoo 와 enum 셋이 다르므로 자기 컬럼은 별개 검증.
      // smoking/drinking/marriage_view 와 같이 인용된 문자열로 잡힘.
      expect(sql).toMatch(/'none'/);
      expect(sql).toMatch(/'small'/);
      expect(sql).toMatch(/'large'/);
    });

    it("CHECK 제약 키워드 자체가 존재한다 (4 개 컬럼 각각)", () => {
      // 마이그레이션 본문에 `check (` 토큰이 최소 4회 (각 컬럼당 1회).
      const matches = sql.match(/check\s*\(/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("nullable — 모든 컬럼 선택 입력", () => {
    it("smoking 컬럼 정의에 NOT NULL 이 없다", () => {
      // smoking 컬럼 정의 구간을 가능한 한 좁게 잡고 안에 not null 이 없는지 확인.
      // ALTER TABLE friends ADD COLUMN smoking ... [세미콜론까지의 구간].
      const match = sql.match(/add\s+column\s+smoking[^;]*/);
      expect(match).not.toBeNull();
      expect(match?.[0]).not.toMatch(/not\s+null/);
    });

    it("drinking 컬럼 정의에 NOT NULL 이 없다", () => {
      const match = sql.match(/add\s+column\s+drinking[^;]*/);
      expect(match).not.toBeNull();
      expect(match?.[0]).not.toMatch(/not\s+null/);
    });

    it("marriage_view 컬럼 정의에 NOT NULL 이 없다", () => {
      const match = sql.match(/add\s+column\s+marriage_view[^;]*/);
      expect(match).not.toBeNull();
      expect(match?.[0]).not.toMatch(/not\s+null/);
    });

    it("tattoo 컬럼 정의에 NOT NULL 이 없다", () => {
      const match = sql.match(/add\s+column\s+tattoo[^;]*/);
      expect(match).not.toBeNull();
      expect(match?.[0]).not.toMatch(/not\s+null/);
    });
  });

  describe("기존 0003 / 0004 정의 무손상 — ALTER ADD COLUMN 만 사용", () => {
    it("0005 는 friends 의 다른 컬럼을 DROP 하지 않는다", () => {
      // 0003/0004 에서 닫힌 V1 컬럼 정리 외에 0005 가 추가로 column 을 drop 하면 안 됨.
      // 사실상 friends 에 대한 drop column 토큰이 0005 에 등장하면 안 된다.
      expect(sql).not.toMatch(/alter\s+table\s+friends[\s\S]{0,200}?drop\s+column/);
    });

    it("0005 는 friends 테이블을 DROP 하지 않는다", () => {
      expect(sql).not.toMatch(/drop\s+table[\s\S]{0,40}?friends\b/);
    });

    it("0005 는 friend_ideals 1:1 테이블을 만지지 않는다 (본인 컬럼은 별개)", () => {
      // 0003 이 정의한 friend_ideals (이상형 측) 와 0005 의 본인 프로필 컬럼은
      // 의미상 분리되어 있어야 함. 0005 안에 friend_ideals 참조가 없어야 정합.
      expect(sql).not.toMatch(/friend_ideals/);
    });
  });
});
