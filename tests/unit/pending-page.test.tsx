/**
 * app/pending/page.tsx — 011 §D3 액션 카드 3개 단위 테스트.
 *
 * 결정 로그 011 §D3:
 *   안내문구(기다리는 동안 할 수 있는 것)를 클릭 가능한 액션 카드 3개로 업그레이드.
 *     - "프로필 채우기"        → /me/profile
 *     - "이런 분이면 좋겠어요"   → /me/preferences
 *     - "연애 성향 테스트 하기" → /me/survey
 *
 * 검증 포인트:
 *   1. 3개 링크 모두 렌더되고 각자 정확한 href 를 가진다 (name 매칭으로 selector 좁힘)
 *   2. 기존 "심사 중이에요" 타이틀이 그대로 유지된다 (회귀 방지)
 *
 * 기존 li 3개 안내 문장은 카드로 교체되거나 카드와 공존 — 본 spec 은 카드(=link)
 * 형태로만 검증하며 li 의 존재 여부에는 의존하지 않는다.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PendingPage from "@/app/pending/page";

describe("/pending 페이지 — 011 §D3 액션 카드", () => {
  it("심사 대기 안내 타이틀이 여전히 노출된다 (회귀 유지)", () => {
    render(<PendingPage />);
    expect(
      screen.getByRole("heading", { name: /심사 대기 중/ }),
    ).toBeInTheDocument();
  });

  it("'프로필' 액션 카드가 /me/profile 로 이동하는 링크로 렌더된다", () => {
    render(<PendingPage />);
    // 카드 라벨에 '프로필' 이 포함된 링크가 존재해야 한다.
    const link = screen.getByRole("link", { name: /프로필/ });
    expect(link).toHaveAttribute("href", "/me/profile");
  });

  it("'이런 분이면 좋겠어요' 액션 카드가 /me/preferences 로 이동하는 링크로 렌더된다", () => {
    render(<PendingPage />);
    const link = screen.getByRole("link", { name: /이런 분/ });
    expect(link).toHaveAttribute("href", "/me/preferences");
  });

  it("'연애 성향 테스트' 액션 카드가 /me/survey 로 이동하는 링크로 렌더된다", () => {
    render(<PendingPage />);
    const link = screen.getByRole("link", { name: /연애 성향/ });
    expect(link).toHaveAttribute("href", "/me/survey");
  });

  it("/me/profile, /me/preferences, /me/survey 세 링크가 모두 한 페이지에 동시 존재한다", () => {
    render(<PendingPage />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/me/profile", "/me/preferences", "/me/survey"]),
    );
  });
});
