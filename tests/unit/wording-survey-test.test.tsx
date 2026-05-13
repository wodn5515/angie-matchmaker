/**
 * "설문" → "연애 성향 테스트" 워딩 정합 — 013 §D4 단위 spec.
 *
 * 결정 로그: docs/decisions/013-pending-deprecation.md §D4
 *
 * ## 배경
 *
 * 가입자 측 호칭이 카드 라벨에선 "연애 성향 테스트", 페이지 본문·운영자 측 도구에선
 * "설문" 으로 혼재. 같은 대상의 호칭이 일관되지 않다.
 *
 * D4 결정: 사용자 가시 카피 모두 "연애 성향 테스트" (또는 줄여 "테스트") 로 통일.
 *   - 단, 코드 변수·함수·테이블·URL·컴포넌트명 (`surveys` / `Survey*` / `/me/survey` /
 *     `ensureStandardSurvey`) 은 유지 — 도메인 모델명은 일반 표현이 적합하고 변경
 *     표면이 거대.
 *   - 본 spec 은 **사용자 가시 텍스트 (JSX 리터럴 / aria-label)** 만 검증.
 *
 * ## 검증 전략
 *
 * me-page-copy.test.tsx 와 동일하게 소스 파일 텍스트를 fs 로 읽어 카피 정합 검증.
 * RTL 로 컴포넌트 렌더하기엔 mock 표면이 넓거나 (server component) client 컴포넌트
 * 라도 작은 라벨 한두 줄만 보면 충분.
 *
 * "설문" 단독 사용 부재 검증은 **사용자 가시 영역에 한정** — 코드의 `surveys` /
 * `Survey*` / `ensureStandardSurvey` 같은 식별자는 spec 외 영역. 따라서 정규식은
 * "한글 단어로서의 '설문'" 만 잡도록 설계.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const WORKTREE_ROOT = path.resolve(__dirname, "../..");

function readSource(relative: string): string {
  return readFileSync(path.resolve(WORKTREE_ROOT, relative), "utf-8");
}

/**
 * JSX/JS 리터럴 영역의 한글 단어 "설문" 등장 검출.
 *
 * 정밀하게: 한글 또는 공백/문장부호 사이에 단어로 등장하는 "설문" 만 잡고,
 * `Survey` 같은 식별자/import 는 영향 없음 (한글 자체).
 *
 * 코드 주석은 spec 대상 외 영역이지만 (D4 §유지 — 코드 주석 유지 가능) 본 spec
 * 의 정규식은 주석/JSX 구분 안 함. 즉 worker 가 카피 정정 시 주변 주석에 같은
 * 단어가 남아있으면 같이 갱신해야 spec 통과. 결정 로그 D4 §유지 의 "코드 주석"
 * 은 `app/me/page.tsx:55` 한 줄 예시이지 본 spec 대상 파일에 한해서는 아니라
 * 일관 정정이 자연.
 */
function countSeolmun(source: string): number {
  // 한글 단어 경계로서의 "설문" — 앞이 한글이거나 문장 시작/괄호 등, 뒤도 동일.
  // 식별자에 "설문" 한글이 들어가는 경우는 도메인상 없음.
  const matches = source.match(/설문/g);
  return matches?.length ?? 0;
}

describe("워딩 정합 — 013 §D4 ('설문' → '연애 성향 테스트')", () => {
  describe("app/me/survey/page.tsx — 가입자 측 빈 상태 카피", () => {
    const source = readSource("app/me/survey/page.tsx");

    it("'연애 성향 테스트' 표현이 한 곳 이상 등장한다 (헤더 + 빈 상태 일관)", () => {
      expect(source).toMatch(/연애 성향 테스트/);
    });

    it("'아직 준비된 설문이 없어요' 류 빈 상태 카피에서 '설문' 단어가 사라졌다", () => {
      // D4 Before: "아직 준비된 설문이 없어요."
      // D4 After:  "아직 준비된 연애 성향 테스트가 없어요."
      expect(source).not.toMatch(/아직 준비된 설문/);
    });

    it("사용자 가시 카피에서 '설문' 단독 한글 단어가 전혀 등장하지 않는다", () => {
      // 헤더("연애 성향 테스트") / 빈 상태 / Empty state 모두 정합.
      // 코드의 `surveys` / `Survey*` / `ensureStandardSurvey` 같은 식별자는
      // 한글이 아니므로 자연 통과.
      expect(countSeolmun(source)).toBe(0);
    });
  });

  describe("app/onboarding/survey/page.tsx — 온보딩 Step 3 빈 상태 카피", () => {
    const source = readSource("app/onboarding/survey/page.tsx");

    it("'연애 성향 테스트' 표현이 한 곳 이상 등장한다 (Step 헤더 일관)", () => {
      expect(source).toMatch(/연애 성향 테스트/);
    });

    it("'아직 준비된 설문이 없어요. 운영자에게 문의해주세요.' 의 '설문' 단어가 사라졌다", () => {
      // D4 Before: "아직 준비된 설문이 없어요. 운영자에게 문의해주세요."
      // D4 After:  "아직 준비된 연애 성향 테스트가 없어요. 운영자에게 문의해주세요."
      expect(source).not.toMatch(/아직 준비된 설문/);
    });

    it("사용자 가시 카피에서 '설문' 단독 한글 단어가 전혀 등장하지 않는다", () => {
      expect(countSeolmun(source)).toBe(0);
    });
  });

  describe("components/operator/dashboard-widgets.tsx — QuickLink 라벨", () => {
    const source = readSource("components/operator/dashboard-widgets.tsx");

    it("'설문 편집' QuickLink 라벨이 사라졌다 (D4 변경 대상)", () => {
      // D4 Before: <QuickLink ... title="설문 편집" />
      // D4 After:  <QuickLink ... title="연애 성향 테스트 편집" /> (또는 등가)
      expect(source).not.toMatch(/"설문 편집"/);
    });

    it("'연애 성향 테스트' 라벨이 한 곳 이상 등장한다", () => {
      // worker 가 "연애 성향 테스트 편집" / "연애 성향 테스트" / 줄임 "테스트 편집"
      // 등 자연스러운 카피 선택할 수 있도록 키워드 부분 일치로만 검증.
      expect(source).toMatch(/연애 성향 테스트/);
    });

    it("'성향 응답' 같은 코드상 stat 라벨은 영향 없음 (회귀 방지)", () => {
      // UserStatsWidget 의 "성향 응답" stat 라벨은 별개 — D4 변경 대상이 아니다.
      // worker 가 실수로 stat 까지 갈아치우는 회귀를 막기 위해 명시적 유지 검증.
      expect(source).toMatch(/성향 응답/);
    });
  });

  describe("components/operator/surveys-tabs.tsx — aria-label", () => {
    const source = readSource("components/operator/surveys-tabs.tsx");

    it("'설문 하위 메뉴' aria-label 이 사라졌다 (D4 변경 대상)", () => {
      // D4 Before: aria-label="설문 하위 메뉴"
      // D4 After:  aria-label="연애 성향 테스트 하위 메뉴" (또는 등가)
      expect(source).not.toMatch(/"설문 하위 메뉴"/);
    });

    it("'연애 성향 테스트' 라벨이 한 곳 이상 등장한다", () => {
      expect(source).toMatch(/연애 성향 테스트/);
    });
  });
});
