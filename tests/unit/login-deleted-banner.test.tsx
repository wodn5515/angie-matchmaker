/**
 * /login 페이지 `?deleted=1` 안내 배너 단위 spec — 014 §D5.
 *
 * 결정 로그: docs/decisions/014-account-self-delete.md §D5
 *
 * ## 배경
 *
 * 가입자가 자가 탈퇴를 완료하면 `redirect("/login?deleted=1")` 으로 도착.
 * /login 페이지가 query param 을 감지해 한 줄 안내 노출:
 *
 *   "계정이 삭제됐어요. 다시 가입하려면 Google 로 로그인해주세요."
 *
 * `?deleted=1` 만 안내 표시. 다른 값 (`?deleted=0`, `?deleted=xxx`) 이나 부재 시
 * 안내 없음 — 임의 query 로 안내 띄우는 우회 방지 (`error=not_operator`,
 * `reason=session_expired` 와 동일 enum 화 패턴).
 *
 * ## 검증 전략
 *
 * /login 페이지는 server component (await searchParams) + `getOperatorOrNull` 호출.
 * 운영자 redirect 분기 / supabase 의존이 있어 RTL 직접 렌더 어려움 → **fs 텍스트
 * 회귀** 로 페이지 소스에 안내 카피와 `?deleted=1` 분기 키워드가 있음을 검증.
 *
 * 운영 사용 경험 자체는 e2e `account-self-delete.spec.ts` 가 final assertion 으로 커버.
 *
 * worker 자율 채택안:
 *   - searchParams 에 `deleted?: string` 추가
 *   - sp.deleted === "1" 일 때 안내 블록 렌더
 *   - 안내 컴포넌트 분리는 worker 자율 — fs spec 은 페이지 소스 안의 카피 토큰만 검증
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const LOGIN_PAGE_PATH = path.resolve(__dirname, "../../app/login/page.tsx");
const LOGIN_FORM_PATH = path.resolve(__dirname, "../../app/login/login-form.tsx");

function readLoginSources(): string {
  // 페이지 자체 또는 form 컴포넌트 어느 쪽에서 처리해도 통과시킨다.
  // 단, 안내 자체는 server component 인 page 가 분기하는 것이 자연 (Lead 채택안).
  const page = existsSync(LOGIN_PAGE_PATH)
    ? readFileSync(LOGIN_PAGE_PATH, "utf-8")
    : "";
  const form = existsSync(LOGIN_FORM_PATH)
    ? readFileSync(LOGIN_FORM_PATH, "utf-8")
    : "";
  return page + "\n" + form;
}

describe("/login ?deleted=1 안내 배너 — 014 §D5", () => {
  describe("페이지가 deleted query param 을 받는다", () => {
    it("LoginPage 의 searchParams 타입에 'deleted' 가 포함된다", () => {
      // page.tsx 의 `searchParams: Promise<{ error?: string; reason?: string }>`
      // 에 deleted 가 추가돼야 한다.
      const source = readLoginSources();
      expect(source).toMatch(/deleted\??:\s*string/);
    });

    it("deleted === '1' 분기가 코드에 존재한다", () => {
      // sp.deleted === "1" 또는 deleted === "1" 패턴.
      const source = readLoginSources();
      expect(source).toMatch(/deleted\s*===?\s*["']1["']/);
    });
  });

  describe("안내 카피 — 핵심 키워드", () => {
    it("'계정이 삭제' 톤이 노출된다", () => {
      // §D5 본문 — "계정이 삭제됐어요. ..."
      const source = readLoginSources();
      expect(source).toMatch(/계정이?\s*삭제/);
    });

    it("'다시 가입하려면 Google' 톤이 노출된다", () => {
      // §D5 본문 — "다시 가입하려면 Google 로 로그인해주세요."
      const source = readLoginSources();
      expect(source).toMatch(/다시\s*가입.*Google|Google.*다시\s*가입/);
    });
  });

  describe("?deleted 가 1 이 아닐 때는 안내 부재 (enum 화 보호)", () => {
    it("코드에 'deleted !== \"1\"' 또는 동치 형태의 가드가 사실상 존재한다", () => {
      // 가장 안전한 정합: `sp.deleted === "1"` 조건만 안내를 노출. 가드를 빠뜨려
      // 임의 query (예: ?deleted=any) 로 안내 노출되면 안 됨. 코드상 conditional
      // 렌더 (`sp.deleted === "1" ? <Banner /> : null` 또는 `&&` 패턴) 자체가
      // 존재하는지를 검증.
      const source = readLoginSources();
      // 다음 둘 중 하나는 존재해야 한다.
      const hasStrictGuard =
        /sp\.deleted\s*===?\s*["']1["']|deleted\s*===?\s*["']1["']/.test(source);
      expect(hasStrictGuard).toBe(true);
    });
  });
});
