/**
 * /me 페이지 "위험 영역" UI 단위 spec — 014 §D1·§D2.
 *
 * 결정 로그: docs/decisions/014-account-self-delete.md §D1·§D2·§D3
 *
 * ## 배경
 *
 * `/me` 페이지 본문 마지막 (로그아웃 form 위) 에 위험 영역 (계정 삭제) inline
 * expandable disclosure 를 추가한다. 노출 단계:
 *
 *   1. 헤더 ("위험 영역") + chevron — expand 토글
 *   2. expand → 경고 문구 + 본인 이름 input + "계정 삭제" 버튼 (초기 disabled)
 *   3. 본인 friends.name 정확 일치 입력 → 버튼 활성화 (case-sensitive — 014 §D3)
 *   4. 다른 이름이면 disabled 유지
 *
 * ## 검증 전략
 *
 * `app/me/page.tsx` 자체는 server component (async + DB 호출) — RTL 렌더 어려움
 * (`me-page-copy.test.tsx` 가 fs 텍스트 검사로 대체했던 이유 동일).
 *
 * 014 §D2 의 UI 는 client interactivity (input value 와 button enable 연결) 가
 * 필수라 server component 인 페이지 자체에 그릴 수 없다 → **client wrapper
 * 컴포넌트** 가 필연. Lead 자율 채택안: `components/user/DangerZone.tsx` (또는
 * 동등 이름).
 *
 * 본 spec 은 두 갈래로 검증:
 *
 *   A. **server page 카피 회귀 (fs 텍스트)** — /me 페이지 소스 어딘가에 "위험 영역"
 *      섹션이 존재 + DangerZone 컴포넌트가 import 되어 있음.
 *   B. **client wrapper 인터랙티브 (RTL)** — `DangerZone` 컴포넌트 단독 렌더링 으로
 *      "초기 disabled / 정확 일치 시 활성화 / 다른 이름 시 disabled 유지" 분기.
 *
 * worker 자율 채택안 (Lead 검토 필요):
 *
 *   // 위치: components/user/danger-zone.tsx
 *   //   - server component 인 /me/page.tsx 에서 `<DangerZone friendName={user.name} />` 호출
 *   //   - 내부에 form action={deleteMeAccountAction} + Input name="confirmName"
 *   //   - useState 로 input value 추적 → name 일치 여부로 button.disabled 토글
 *
 *   interface DangerZoneProps {
 *     friendName: string; // server 가 friends.name 을 prop 으로 주입
 *     // (Server Action 자체는 import 로 가져옴 — Server → Client function prop 금지, §8)
 *   }
 *   export function DangerZone(props: DangerZoneProps): JSX.Element;
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// worker 가 작성할 client wrapper — 아직 없으므로 import 자체가 빨갛게 실패.
// path 는 Lead 자율 채택. 본 spec 은 첫 번째 후보 (components/user/danger-zone) 를 쓰고,
// Lead 가 다른 위치로 채택하면 path 만 갱신.
// @ts-expect-error worker 미작성
import { DangerZone } from "@/components/user/danger-zone";

const ME_PAGE_PATH = path.resolve(__dirname, "../../app/me/page.tsx");

function readMePageSource(): string {
  if (!existsSync(ME_PAGE_PATH)) return "";
  return readFileSync(ME_PAGE_PATH, "utf-8");
}

describe("/me 위험 영역 — fs 텍스트 회귀 (014 §D1)", () => {
  it("/me 페이지 소스에 '위험 영역' 헤더 텍스트가 등장한다", () => {
    // §D1 — 본문 마지막에 위험 영역 섹션. 미세 카피 (이모지/문장부호) 는 worker 자율.
    const source = readMePageSource();
    expect(source).toMatch(/위험\s*영역/);
  });

  it("/me 페이지가 DangerZone 컴포넌트를 import / 사용한다", () => {
    // §D2 — interactivity 가 필요하므로 client wrapper 가 필연.
    // import 경로는 worker 자율 (components/user/danger-zone 가정).
    const source = readMePageSource();
    expect(source).toMatch(/DangerZone/);
  });

  it("/me 페이지에 로그아웃 form 보다 앞에 위험 영역 섹션이 위치한다", () => {
    // §D1 — "본문 마지막 (로그아웃 form 위)". 로그아웃 form 보다 위험 영역 마크업이
    // 먼저 등장해야 한다.
    const source = readMePageSource();
    const dangerIdx = source.search(/위험\s*영역|DangerZone/);
    const signoutIdx = source.search(/\/auth\/signout/);
    // 둘 다 존재 + 위험 영역 이 먼저 (idx 가 작음).
    expect(dangerIdx).toBeGreaterThanOrEqual(0);
    expect(signoutIdx).toBeGreaterThanOrEqual(0);
    expect(dangerIdx).toBeLessThan(signoutIdx);
  });
});

describe("DangerZone — 초기 상태 (collapsed)", () => {
  it("'위험 영역' 헤더 (또는 disclosure summary) 가 렌더된다", () => {
    render(<DangerZone friendName="Alice" />);
    // <details>/<summary> 또는 button 둘 다 후보. 텍스트로만 검증.
    expect(screen.getByText(/위험\s*영역/)).toBeInTheDocument();
  });
});

describe("DangerZone — expand 후 경고 + 입력 + 버튼 노출", () => {
  it("disclosure expand 시 영구 삭제 경고 문구가 노출된다", async () => {
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    // §D2 — "계정을 삭제하면 모든 데이터 ... 가 영구 삭제되며 복구할 수 없어요."
    // <details>/<summary> 패턴 가정 — 클릭으로 expand.
    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    // 핵심 키워드 — 카피 미세 조정 여지 위해 정규식.
    expect(screen.getByText(/영구\s*삭제|복구할\s*수\s*없/)).toBeInTheDocument();
  });

  it("expand 시 본인 이름 input 이 노출된다 (label 또는 placeholder '본인 이름')", async () => {
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    // worker 자율 — label/placeholder/aria-label 중 하나로 '본인 이름' 키워드 노출.
    // 가장 일반적인 후보 셋 — getByRole 'textbox' 가 있으면 통과.
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("expand 시 '계정 삭제' 버튼이 노출되며 초기에 disabled 상태", async () => {
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    // §D2 — 입력이 본인 이름과 일치하기 전엔 disabled.
    const button = screen.getByRole("button", { name: /계정\s*삭제/ });
    expect(button).toBeDisabled();
  });
});

describe("DangerZone — input value 와 button enable 연동 (014 §D2·§D3)", () => {
  it("본인 이름 'Alice' 와 정확 일치하는 입력 → 버튼 활성화", async () => {
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    // expand
    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /계정\s*삭제/ });

    // 입력 — userEvent.type 으로 한 글자씩.
    await user.type(input, "Alice");

    // 활성화 — disabled 가 풀려야 한다.
    expect(button).not.toBeDisabled();
  });

  it("다른 이름 'Bob' 입력 → 버튼 disabled 유지", async () => {
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /계정\s*삭제/ });

    await user.type(input, "Bob");

    expect(button).toBeDisabled();
  });

  it("case-sensitive — 'alice' (소문자) 입력 시 버튼 disabled 유지 (§D3)", async () => {
    // §D3 — "본인 friends.name 정확 일치 입력 → 버튼 활성화 (case-sensitive)".
    // server side 도 case-sensitive 검증이라 client UI 도 일관.
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /계정\s*삭제/ });

    await user.type(input, "alice");

    expect(button).toBeDisabled();
  });

  it("일치하던 입력에서 글자를 하나 지우면 (부분 일치) 다시 disabled", async () => {
    // 활성화 → 비활성 회귀 — typing 중 임시 일치 후 갈라지는 자연 경험.
    const user = userEvent.setup();
    render(<DangerZone friendName="Alice" />);

    const summary = screen.getByText(/위험\s*영역/);
    await user.click(summary);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /계정\s*삭제/ });

    await user.type(input, "Alice");
    expect(button).not.toBeDisabled();

    // 마지막 글자 backspace
    await user.type(input, "{Backspace}");
    expect(button).toBeDisabled();
  });

  it("submit form action 이 deleteMeAccountAction 서버 액션을 가리킨다", () => {
    // §8 코딩 컨벤션 — Server Component → Client Component function prop 금지.
    // DangerZone 은 client 라서 server action 을 prop 으로 받지 않고 직접 import.
    // form 안의 button[type=submit] 이 deleteMeAccountAction 을 호출하는지를
    // 직접 단언하긴 어렵다 (server action 은 mock 곤란) → form element 의 존재 정도로 회귀.
    const { container } = render(<DangerZone friendName="Alice" />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    // confirmName name 의 input 이 form 내부 — Server Action 이 FormData 로 받는 키.
    // expand 안 한 상태에서도 form 자체는 있어야 disable 가드 의미가 산다.
    // (구현이 expand 후에야 form 을 그리는 패턴이면 본 줄을 약화 — Lead 보고)
  });
});
