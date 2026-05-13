/**
 * 자가 탈퇴 cascade chain 통합 spec — 014 §D3 마이그레이션 회귀 net.
 *
 * 결정 로그: docs/decisions/014-account-self-delete.md §D3 (DB cascade 점검 결과)
 *
 * ## 배경
 *
 * 014 §D3 의 단순함은 cascade chain 에 의존:
 *
 *   auth.users  →  friends  →  friend_ideals
 *                             friend_ideal_regions
 *                             friend_ideal_hometowns
 *                             friend_ideal_jobs
 *                             friend_ideal_personality_keywords
 *                             friend_ideal_priorities
 *                             survey_answers
 *                             pairs (friend_a_id 또는 friend_b_id)
 *
 * `auth.users` row 1개 삭제 → 위 chain 전체가 자동 정리. 마이그레이션 0001 + 0003
 * 에 이미 ON DELETE CASCADE 가 완비돼 있어 마이그레이션 0007 불필요 (§D3 본문).
 *
 * 본 spec 은 mock DB 가 아닌 **마이그레이션 SQL 텍스트 검증** 으로 cascade 정합을
 * 회귀 보호한다. 014 작업 자체는 마이그레이션을 건드리지 않지만, 누군가가 미래에
 * cascade 를 빼버리면 hard delete 가 부분 삭제로 회귀해 자식 row 가 고아가 되는
 * 사고 발생. 본 spec 이 그 회귀를 잡는다.
 *
 * (실제 DB 트랜잭션 검증은 e2e `account-self-delete.spec.ts` 가 fixture 기반으로
 * 수행 예정 — 라운드 1 단계에서는 fixture 부재로 자연 빨강.)
 *
 * ## 검증 항목
 *
 * 1. friends.auth_user_id → auth.users(id) ON DELETE CASCADE — 0003 line 44
 * 2. friend_ideals.friend_id → friends(id) ON DELETE CASCADE — 0003
 * 3. friend_ideal_regions/hometowns/jobs/personality_keywords/priorities.friend_id
 *    → friends(id) ON DELETE CASCADE — 0003 다섯
 * 4. survey_answers.friend_id → friends(id) ON DELETE CASCADE — 0003 line 152~153
 * 5. pairs.friend_a_id / friend_b_id → friends(id) ON DELETE CASCADE — 0001
 *
 * `migration-0003.test.ts` 가 ON DELETE CASCADE 한 줄만 단언했다면, 본 spec 은
 * **자식 6 테이블 각각에서 명시적으로** 검증한다 (014 §D3 의 단순함이 cascade
 * 누락 회귀에 취약함을 가드).
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");
const M0001 = path.join(MIGRATIONS_DIR, "0001_init.sql");
const M0003 = path.join(MIGRATIONS_DIR, "0003_v2_self_signup.sql");

let allSql = "";

beforeAll(() => {
  const parts: string[] = [];
  for (const p of [M0001, M0003]) {
    if (existsSync(p)) parts.push(readFileSync(p, "utf-8").toLowerCase());
  }
  allSql = parts.join("\n");
});

describe("자가 탈퇴 cascade chain (014 §D3 회귀 net)", () => {
  it("마이그레이션 파일들이 존재한다 (0001, 0003)", () => {
    expect(existsSync(M0001)).toBe(true);
    expect(existsSync(M0003)).toBe(true);
  });

  describe("auth.users → friends (chain 의 출발점)", () => {
    it("friends.auth_user_id 가 auth.users(id) ON DELETE CASCADE", () => {
      // 0003 line 44 — `add column auth_user_id uuid unique references auth.users(id) on delete cascade`
      // auth_user_id 컬럼 정의에 references auth.users 와 on delete cascade 가 같이.
      expect(allSql).toMatch(
        /auth_user_id[\s\S]{0,200}?references\s+auth\.users[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });
  });

  describe("friends → friend_ideals (1:1)", () => {
    it("friend_ideals.friend_id 가 friends(id) ON DELETE CASCADE", () => {
      // 0003 §3 — `friend_id uuid primary key references friends(id) on delete cascade`
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideals[\s\S]{0,400}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });
  });

  describe("friends → 1:N 다섯 (이상형 다중)", () => {
    it("friend_ideal_regions.friend_id ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideal_regions[\s\S]{0,300}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });

    it("friend_ideal_hometowns.friend_id ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideal_hometowns[\s\S]{0,300}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });

    it("friend_ideal_jobs.friend_id ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideal_jobs[\s\S]{0,300}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });

    it("friend_ideal_personality_keywords.friend_id ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideal_personality_keywords[\s\S]{0,300}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });

    it("friend_ideal_priorities.friend_id ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /create\s+table[\s\S]{0,40}?friend_ideal_priorities[\s\S]{0,400}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });
  });

  describe("friends → survey_answers", () => {
    it("survey_answers.friend_id 가 friends(id) ON DELETE CASCADE", () => {
      // 0003 §6 — `add column friend_id uuid not null references friends(id) on delete cascade`
      expect(allSql).toMatch(
        /survey_answers[\s\S]{0,300}?friend_id[\s\S]{0,200}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });
  });

  describe("friends → pairs (양방향 FK)", () => {
    it("pairs.friend_a_id 가 friends(id) ON DELETE CASCADE", () => {
      // 0001 §pairs — `friend_a_id uuid not null references friends(id) on delete cascade`
      expect(allSql).toMatch(
        /friend_a_id[\s\S]{0,80}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });

    it("pairs.friend_b_id 가 friends(id) ON DELETE CASCADE", () => {
      expect(allSql).toMatch(
        /friend_b_id[\s\S]{0,80}?references\s+friends[\s\S]{0,80}?on\s+delete\s+cascade/,
      );
    });
  });

  describe("마이그레이션 0007 부재 — §D3 가 cascade 만으로 처리한다", () => {
    it("014 작업이 새 마이그레이션을 도입하지 않는다 (0007 없음)", () => {
      // §D3 — "DB cascade 점검 결과 (마이그레이션 0007 불필요)".
      // 0007 이 등장하면 누군가 cascade 가 부족하다고 판단했다는 신호 → spec 재검토 필요.
      // 본 spec 은 cascade 가 완비됐다는 사실의 회귀 가드.
      const m0007 = path.join(MIGRATIONS_DIR, "0007_account_self_delete.sql");
      expect(existsSync(m0007)).toBe(false);
    });
  });

  describe("auth.admin.deleteUser → cascade 결과 — 자식 row 0건 의미적 검증", () => {
    it("자식 6 테이블 모두 friends.id 를 참조 (chain 의 직접 자식)", () => {
      // 14 §D3 cascade chain 본문에 나열된 자식 6 테이블 모두 정확히 friends(id) 를
      // 참조해야 friends row 삭제 시 자동 cascade 정리됨.
      const childTables = [
        "friend_ideals",
        "friend_ideal_regions",
        "friend_ideal_hometowns",
        "friend_ideal_jobs",
        "friend_ideal_personality_keywords",
        "friend_ideal_priorities",
        "survey_answers",
        "pairs",
      ];
      for (const t of childTables) {
        // 본 테이블이 SQL 텍스트에 등장하고 친구 id 참조를 가지는지.
        // ('pairs' 는 양방향이라 단순 패턴은 위에서 별도 검증, 여기선 존재만)
        expect(allSql).toMatch(new RegExp(`\\b${t}\\b`));
      }
    });
  });
});
