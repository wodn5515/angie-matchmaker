/**
 * 마이그레이션 0003_v2_self_signup.sql 정합 테스트.
 *
 * Lead 판단: 실제 Supabase / 도커 Postgres 의존 없이 **SQL 파싱 기반 검증**으로 진행.
 * 이유:
 *   - 현재 CI 가 없고 로컬 도커 의존을 강제하면 worker / 사용자 모두 셋업 부담
 *   - 마이그레이션 정합은 "어떤 제약·인덱스가 있어야 한다" 의 정적 단언이라 SQL 텍스트
 *     검색으로도 충분히 회귀 방지 가치 있음 (PRD §4 의 키 컬럼/제약 명세를 따라가는지)
 *   - worker 가 마이그레이션을 실제 Supabase 에 적용하는 검수는 사용자 수동 단계로
 *
 * worker 가 작성해야 할 파일:
 *   supabase/migrations/0003_v2_self_signup.sql
 *
 * 이 spec 은 다음을 검증:
 *   1. friends 확장 (auth_user_id UNIQUE / recommender_* NOT NULL / status CHECK / onboarding_step / hometown)
 *   2. friends V1 컬럼 제거 (closeness / how_we_met / kakao_id / phone)
 *   3. friend_ideals 1:1 (friend_id PK + ON DELETE CASCADE)
 *   4. 1:N 다중선택 5개 테이블 (regions/hometowns/jobs/personality_keywords/priorities)
 *   5. friend_ideal_priorities: (friend_id, rank) PK + (friend_id, category) UNIQUE
 *   6. survey_answers 스키마 변경: friend_id FK + (friend_id, question_id) UNIQUE + invitation_id 컬럼 부재
 *   7. V1 폐기 테이블 DROP: survey_invitations, friend_invitations
 */

import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/0003_v2_self_signup.sql",
);

let sql = "";

beforeAll(() => {
  if (!existsSync(MIGRATION_PATH)) {
    // worker 가 아직 안 작성 — 빨강 보장
    sql = "";
    return;
  }
  sql = readFileSync(MIGRATION_PATH, "utf-8").toLowerCase();
});

describe("0003_v2_self_signup.sql — 마이그레이션 정합", () => {
  it("마이그레이션 파일이 존재한다", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("friends 테이블 확장", () => {
    it("auth_user_id 컬럼이 UNIQUE 로 추가된다", () => {
      // ALTER TABLE friends ADD COLUMN auth_user_id ... UNIQUE
      // 또는 CREATE UNIQUE INDEX ... ON friends(auth_user_id)
      const hasColumn = /alter\s+table\s+friends[\s\S]*?auth_user_id/.test(sql);
      const hasUnique =
        /unique[\s\S]*?auth_user_id/.test(sql) ||
        /auth_user_id[\s\S]*?unique/.test(sql);
      expect(hasColumn).toBe(true);
      expect(hasUnique).toBe(true);
    });

    it("recommender_name / recommender_relation 컬럼이 NOT NULL 로 추가된다", () => {
      expect(sql).toMatch(/recommender_name/);
      expect(sql).toMatch(/recommender_relation/);
      // NOT NULL 검증 — 컬럼 정의 줄에 not null 키워드 포함
      const recNameNotNull = /recommender_name[^,;]*not\s+null/.test(sql);
      const recRelNotNull = /recommender_relation[^,;]*not\s+null/.test(sql);
      expect(recNameNotNull).toBe(true);
      expect(recRelNotNull).toBe(true);
    });

    it("status 컬럼이 CHECK 제약 ('pending','approved','rejected') 으로 추가된다", () => {
      expect(sql).toMatch(/status/);
      expect(sql).toMatch(/'pending'/);
      expect(sql).toMatch(/'approved'/);
      expect(sql).toMatch(/'rejected'/);
    });

    it("onboarding_step 컬럼이 추가된다", () => {
      expect(sql).toMatch(/onboarding_step/);
    });

    it("hometown 컬럼이 추가된다", () => {
      expect(sql).toMatch(/hometown/);
    });

    it("V1 컬럼 (closeness/how_we_met/kakao_id/phone) 이 DROP 된다", () => {
      // ALTER TABLE friends DROP COLUMN ... 형태
      expect(sql).toMatch(/drop\s+column[\s\S]*?closeness/);
      expect(sql).toMatch(/drop\s+column[\s\S]*?how_we_met/);
      expect(sql).toMatch(/drop\s+column[\s\S]*?kakao_id/);
      expect(sql).toMatch(/drop\s+column[\s\S]*?phone/);
    });
  });

  describe("friend_ideals 1:1 테이블", () => {
    it("friend_ideals 가 생성되고 friend_id 가 PK + ON DELETE CASCADE", () => {
      expect(sql).toMatch(/create\s+table[\s\S]*?friend_ideals/);
      // friend_id 가 PK 인지 검증 — 가장 흔한 패턴 두 가지 허용
      const pkInline = /friend_id\s+uuid[^,;]*primary\s+key/.test(sql);
      const pkTableLevel = /primary\s+key\s*\(\s*friend_id\s*\)/.test(sql);
      expect(pkInline || pkTableLevel).toBe(true);
      expect(sql).toMatch(/on\s+delete\s+cascade/);
    });

    it("이상형 단일값 enum 컬럼 4개가 모두 있음", () => {
      // smoking / drinking / marriage_timing / tattoo
      expect(sql).toMatch(/smoking/);
      expect(sql).toMatch(/drinking/);
      expect(sql).toMatch(/marriage_timing/);
      expect(sql).toMatch(/tattoo/);
    });
  });

  describe("1:N 다중선택 테이블 5개", () => {
    it("friend_ideal_regions 생성 + (friend_id, region) PK", () => {
      expect(sql).toMatch(/create\s+table[\s\S]*?friend_ideal_regions/);
      expect(sql).toMatch(/primary\s+key\s*\(\s*friend_id\s*,\s*region\s*\)/);
    });

    it("friend_ideal_hometowns 생성 + (friend_id, hometown) PK", () => {
      expect(sql).toMatch(/create\s+table[\s\S]*?friend_ideal_hometowns/);
      expect(sql).toMatch(/primary\s+key\s*\(\s*friend_id\s*,\s*hometown\s*\)/);
    });

    it("friend_ideal_jobs 생성 + (friend_id, job) PK", () => {
      expect(sql).toMatch(/create\s+table[\s\S]*?friend_ideal_jobs/);
      expect(sql).toMatch(/primary\s+key\s*\(\s*friend_id\s*,\s*job\s*\)/);
    });

    it("friend_ideal_personality_keywords 생성 + (friend_id, keyword) PK", () => {
      expect(sql).toMatch(
        /create\s+table[\s\S]*?friend_ideal_personality_keywords/,
      );
      expect(sql).toMatch(/primary\s+key\s*\(\s*friend_id\s*,\s*keyword\s*\)/);
    });

    it("friend_ideal_priorities 생성 + (friend_id, rank) PK + (friend_id, category) UNIQUE", () => {
      expect(sql).toMatch(/create\s+table[\s\S]*?friend_ideal_priorities/);
      expect(sql).toMatch(/primary\s+key\s*\(\s*friend_id\s*,\s*rank\s*\)/);
      // UNIQUE (friend_id, category) — 같은 카테고리 두 순위 차지 금지
      expect(sql).toMatch(/unique\s*\(\s*friend_id\s*,\s*category\s*\)/);
      // rank CHECK (1,2,3)
      expect(sql).toMatch(/rank[\s\S]*?in\s*\(\s*1\s*,\s*2\s*,\s*3\s*\)/);
    });
  });

  describe("survey_answers 스키마 변경", () => {
    it("friend_id FK 컬럼이 추가된다", () => {
      // ALTER TABLE survey_answers ADD COLUMN friend_id ... REFERENCES friends ...
      // 또는 신규 컬럼으로 정의
      expect(sql).toMatch(/survey_answers[\s\S]*?friend_id/);
      expect(sql).toMatch(/friend_id[\s\S]*?references\s+friends/);
    });

    it("(friend_id, question_id) UNIQUE 제약이 추가된다", () => {
      expect(sql).toMatch(
        /unique\s*\(\s*friend_id\s*,\s*question_id\s*\)/,
      );
    });

    it("invitation_id 컬럼이 DROP 된다", () => {
      expect(sql).toMatch(/drop\s+column[\s\S]*?invitation_id/);
    });

    it("기존 (invitation_id, question_id) UNIQUE 제약 또는 인덱스가 제거된다", () => {
      // 명시적 DROP CONSTRAINT 또는 DROP INDEX
      const dropsConstraint =
        /drop\s+constraint[\s\S]*?(invitation_id|survey_answers_(invitation|key))/i.test(
          sql,
        );
      const dropsIndex = /drop\s+index[\s\S]*?invitation/i.test(sql);
      const cascadeDrop = /drop\s+column[\s\S]*?invitation_id[\s\S]*?cascade/.test(
        sql,
      );
      expect(dropsConstraint || dropsIndex || cascadeDrop).toBe(true);
    });
  });

  describe("V1 폐기 테이블 DROP", () => {
    it("survey_invitations 테이블이 DROP 된다", () => {
      expect(sql).toMatch(/drop\s+table[\s\S]*?survey_invitations/);
    });

    it("friend_invitations 테이블이 DROP 된다", () => {
      expect(sql).toMatch(/drop\s+table[\s\S]*?friend_invitations/);
    });
  });
});
