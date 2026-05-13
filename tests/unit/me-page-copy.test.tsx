/**
 * /me 페이지 카피 정직성 회복 — 013 §D3 단위 spec.
 *
 * 결정 로그: docs/decisions/013-pending-deprecation.md §D3
 *
 * ## 배경
 *
 * 사용자 확인: 운영자는 외부 채널(메일·카톡)로 통과/거절·매칭 결과를 **직접 안내하지
 * 않는다**. PR #21 의 카피 일반화에서 "카톡" → "직접 안내" 까지만 손대고 안내 행위
 * 자체의 존재 여부는 미검토 — "직접 안내드릴게요" / "직접 안내해요" 가 결과적으로
 * 거짓 약속이 됐다.
 *
 * D3 결정: `/me` 의 안내 텍스트 3 군데에서 "직접 안내" 약속 제거.
 *
 *   | 위치                                | After                                                          |
 *   |-------------------------------------|----------------------------------------------------------------|
 *   | pending StatusBanner description    | "운영자가 검토 중이에요. 미리 채워두면 매칭 풀에 더 빨리 합류할 수 있어요." |
 *   | approved StatusBanner description   | "운영자가 잘 어울리는 분을 찾고 있어요."                       |
 *   | 하단 footer 본문                    | **삭제** (배너만으로 안내 충분)                                |
 *
 * 원칙: "안내드릴게요" 같은 미래 약속 표현 X. 검토·매칭 행위의 사실만.
 *
 * ## 검증 전략
 *
 * `app/me/page.tsx` 는 server component (async + DB 호출) 라 RTL 로 직접 렌더하기
 * 어렵다 — 011 의 `pending-page.test.tsx` 와 달리 `/me` 페이지는 mock 표면이 너무
 * 넓다 (requireOnboardedUser / service client / profileCompletion / ideals / surveys /
 * answers 전부 mock 필요). 본 spec 은 **소스 파일 텍스트** 를 fs 로 읽어 카피의
 * 존재/부재를 검증한다. 카피 정정만 검증하면 충분하고, 페이지 렌더링 자체는
 * 011 의 e2e `pending-me-access.spec.ts` 와 013 의 `pending-deprecation.spec.ts` 가
 * 커버.
 *
 * 향후 worker 가 카피를 컴포넌트화하거나 i18n 으로 옮기면 spec 도 그에 맞춰
 * 갱신해야 한다 — 그 시점은 별도 결정 로그.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ME_PAGE_PATH = path.resolve(
  __dirname,
  "../../app/me/page.tsx",
);

function readMePageSource(): string {
  return readFileSync(ME_PAGE_PATH, "utf-8");
}

describe("/me 카피 정직성 — 013 §D3", () => {
  describe("'직접 안내' 약속 제거", () => {
    it("페이지 소스 어디에도 '직접 안내' 문구가 없다 (pending/approved 배너 + 하단 footer 전부)", () => {
      const source = readMePageSource();
      expect(source).not.toMatch(/직접 안내/);
    });

    it("'안내드릴게요' / '안내드려요' 같은 미래 약속 표현이 없다", () => {
      // D3 원칙: "안내드릴게요" 류 미래 약속 표현 전면 제거.
      const source = readMePageSource();
      expect(source).not.toMatch(/안내드릴게요/);
      expect(source).not.toMatch(/안내드려요/);
    });
  });

  describe("pending StatusBanner description — D3 새 카피", () => {
    it("'운영자가 검토 중이에요' 톤이 노출된다 (검토 사실만)", () => {
      // D3 결정 문장 그대로의 강제 일치는 카피 미세 조정 여지를 박탈하므로
      // 핵심 키워드만 정규식으로 검증.
      const source = readMePageSource();
      expect(source).toMatch(/검토 중/);
    });

    it("'매칭 풀에 더 빨리 합류' 류 동기 부여 문구가 노출된다", () => {
      const source = readMePageSource();
      // "매칭 풀" + "합류" 둘 다 같은 description 블록에 등장하면 정합.
      expect(source).toMatch(/매칭 풀/);
      expect(source).toMatch(/합류/);
    });
  });

  describe("approved StatusBanner description — D3 새 카피", () => {
    it("'잘 어울리는 분을 찾고 있어요' 톤이 노출된다 (매칭 진행 사실만)", () => {
      // D3 결정 — Before: "잘 어울리는 분을 찾으면 직접 안내드려요."
      //         After:  "잘 어울리는 분을 찾고 있어요."
      // "찾고 있어요" 가 새 카피의 핵심 — 약속 표현 없는 현재진행형.
      const source = readMePageSource();
      expect(source).toMatch(/찾고 있어요/);
    });

    it("approved 배너에서 '찾으면 직접' 류 약속 표현이 사라졌다", () => {
      const source = readMePageSource();
      // "찾으면 직접 안내" 패턴이 부재해야 한다.
      expect(source).not.toMatch(/찾으면 직접/);
    });
  });

  describe("하단 footer 카피 — D3 삭제 결정", () => {
    it("'매칭은 운영자가 직접 안내해요' footer 문구가 삭제됐다", () => {
      // D3 결정 — 하단 fixed 안내 카피 ("매칭은 운영자가 직접 안내해요...") 삭제.
      // 배너만으로 안내 충분 + 거짓 약속 자리 제거.
      const source = readMePageSource();
      expect(source).not.toMatch(/매칭은 운영자가 직접/);
    });

    it("'사이트에는 따로 표시되지 않으니' footer 문구도 함께 삭제됐다", () => {
      // 같은 footer 블록의 후속 문장도 함께 사라져야 한다 (PRD non-goal
      // "결과 외부 공유" + V1 매칭 결과 가입자 표시 부재로 정확한 통보 경로 없음).
      const source = readMePageSource();
      expect(source).not.toMatch(/사이트에는 따로 표시되지 않으니/);
    });

    it("'안내를 기다려주세요' 류 약속·요구 표현이 사라졌다", () => {
      const source = readMePageSource();
      expect(source).not.toMatch(/안내를 기다려주세요/);
    });
  });
});
