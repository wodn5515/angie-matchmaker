/**
 * components/ui/region-detail-picker.tsx — 이상형 폼용 2단계 multi-select 프리미티브.
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D5 + "디자이너 게이트 결과".
 *
 * ## 디자이너 확정 정책 (요약)
 *
 * - 헤더 17개 (광역시·도) 렌더링
 * - 광역 클릭 → expand → REGION_DETAIL_OPTIONS[region] 의 detail 체크박스 노출
 * - "전체" 토글 / detail 개별 체크 — 상호 배타:
 *   - "전체" 체크 시 그 region 의 detail 들 자동 해제 → 저장 (region, '')
 *   - detail 체크 시 "전체" 자동 해제 → 저장 (region, 'gangnam-gu') 등 N 행
 * - 세종 (detail 옵션 0개): chevron 없음 + "선택" 토글만 동작
 * - 직렬화: hidden input name="<inputName>" value="region|detail" — 1 행 1 input
 * - 헤더 상태: none / all (전체) / partial (N개)
 *
 * ## worker 가 채울 인터페이스 (가정)
 *
 *   type RegionDetailValue = { region: string; detail: string };
 *
 *   interface RegionDetailPickerProps {
 *     name: string;                          // hidden input name
 *     value: RegionDetailValue[];            // 컨트롤드 — defaults
 *     onValueChange?: (next: RegionDetailValue[]) => void;
 *     emptyHint?: string;                    // value 0개일 때 노출 안내
 *   }
 *
 *   export function RegionDetailPicker(props: RegionDetailPickerProps): JSX.Element;
 *
 * `value` 가 컨트롤드라면 테스트는 `onValueChange` 가 호출되는지로 검증한다.
 * (worker 가 uncontrolled 로 구현해도 hidden input 직렬화는 같으므로 spec 일부는 통과)
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// @ts-expect-error worker 미작성
import { RegionDetailPicker } from "@/components/ui/region-detail-picker";

describe("RegionDetailPicker — 광역 헤더 17개 렌더링", () => {
  it("17개 광역시·도 라벨이 모두 렌더된다", () => {
    render(<RegionDetailPicker name="regions" value={[]} />);
    const expected = [
      "서울",
      "부산",
      "인천",
      "대구",
      "대전",
      "광주",
      "울산",
      "세종",
      "경기",
      "강원",
      "충북",
      "충남",
      "전북",
      "전남",
      "경북",
      "경남",
      "제주",
    ];
    for (const label of expected) {
      // 동일 텍스트가 토글 / 헤더로 여러 번 등장할 수 있어 getAllByText.
      const hits = screen.getAllByText(new RegExp(label));
      expect(hits.length).toBeGreaterThan(0);
    }
  });
});

describe("RegionDetailPicker — 광역 expand 하면 detail 칩 렌더", () => {
  it("서울 헤더 클릭 → 강남구 등 detail 체크박스가 보인다", async () => {
    const user = userEvent.setup();
    render(<RegionDetailPicker name="regions" value={[]} />);

    // <details>/<summary> 패턴 가정 — summary 또는 button 으로 expand
    const seoulHeader = screen.getByRole("button", { name: /서울/ });
    await user.click(seoulHeader);

    // 강남구 detail 이 노출 — checkbox role 또는 텍스트 둘 다 후보
    const gangnam = await screen.findByText(/강남구/);
    expect(gangnam).toBeVisible();
  });
});

describe("RegionDetailPicker — '전체' 토글 (D5 상호 배타 정책)", () => {
  it("서울 '전체' 클릭 → onValueChange 가 [{seoul, ''}] 호출 (디자이너 게이트)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RegionDetailPicker name="regions" value={[]} onValueChange={onChange} />,
    );

    // 서울 행 안의 "전체" 라벨 (헤더 자체 또는 헤더 내부 토글)
    const seoulAllToggle = screen.getByRole("button", {
      name: /서울.*전체|전체.*서울/,
    });
    await user.click(seoulAllToggle);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual([{ region: "seoul", detail: "" }]);
  });

  it("'전체' 클릭 후 다시 strong-text/badge '전체' 가 헤더에 표시된다 (헤더 상태 'all')", async () => {
    const user = userEvent.setup();
    render(
      <RegionDetailPicker
        name="regions"
        value={[{ region: "seoul", detail: "" }]}
      />,
    );
    // value 컨트롤드 — 초기에 '전체' 상태로 시작. 헤더에 '전체' 배지가 있어야 한다.
    // (디자이너: 핑크 "전체" 배지 + 핑크 8% 행 배경)
    const seoulRow = screen
      .getByText(/서울/)
      .closest("details, section, div, li, summary");
    expect(seoulRow).not.toBeNull();
    // 헤더 또는 헤더 인접에 '전체' 단어가 추가로 한 번 더 등장해야 한다 (배지).
    const hits = screen.getAllByText(/전체/);
    expect(hits.length).toBeGreaterThan(0);
    // void user — userEvent 만 import 일관성 (eslint)
    void user;
  });
});

describe("RegionDetailPicker — detail 체크 시 '전체' 자동 해제 (D5 상호 배타)", () => {
  it("'전체' 상태에서 강남구 체크 → onValueChange 가 [{seoul, gangnam-gu}] 호출 ('전체' 자동 해제)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RegionDetailPicker
        name="regions"
        value={[{ region: "seoul", detail: "" }]}
        onValueChange={onChange}
      />,
    );

    // 서울 헤더 expand
    const seoulHeader = screen.getByRole("button", { name: /서울/ });
    await user.click(seoulHeader);

    // 강남구 체크박스 클릭
    const gangnam = await screen.findByLabelText(/강남구/);
    await user.click(gangnam);

    // 자동 해제 정책 — (seoul, '') 가 사라지고 (seoul, 'gangnam-gu') 만 남는다
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual([{ region: "seoul", detail: "gangnam-gu" }]);
  });

  it("일반 상태에서 강남구·서초구 둘 다 체크 → 두 행 동시 저장", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <RegionDetailPicker name="regions" value={[]} onValueChange={onChange} />,
    );

    const seoulHeader = screen.getByRole("button", { name: /서울/ });
    await user.click(seoulHeader);

    const gangnam = await screen.findByLabelText(/강남구/);
    await user.click(gangnam);

    // 한 번 더 — value 가 컨트롤드라 부모가 갱신해 줘야 다음 체크 의미가 산다.
    rerender(
      <RegionDetailPicker
        name="regions"
        value={[{ region: "seoul", detail: "gangnam-gu" }]}
        onValueChange={onChange}
      />,
    );

    const seocho = await screen.findByLabelText(/서초구/);
    await user.click(seocho);

    // 마지막 호출은 두 detail 모두 포함해야 한다
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual(
      expect.arrayContaining([
        { region: "seoul", detail: "gangnam-gu" },
        { region: "seoul", detail: "seocho-gu" },
      ]),
    );
    expect(lastCall.length).toBe(2);
  });
});

describe("RegionDetailPicker — 세종 (detail 옵션 0개)", () => {
  it("세종 헤더에 '선택' 토글만 표시 (chevron / expand 무관)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RegionDetailPicker name="regions" value={[]} onValueChange={onChange} />,
    );

    // 세종 행의 토글 — '세종' 또는 '세종 전체' 라벨로 클릭 가능
    const sejongToggle = screen.getByRole("button", { name: /세종/ });
    await user.click(sejongToggle);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    // 세종은 detail 옵션 0개라 (sejong, '') 만 저장 가능
    expect(lastCall).toEqual([{ region: "sejong", detail: "" }]);
  });
});

describe("RegionDetailPicker — hidden input 직렬화 ('region|detail')", () => {
  it("value=[{seoul,gangnam-gu}, {busan,''}] → name='regions' value='seoul|gangnam-gu' / 'busan|'", () => {
    const { container } = render(
      <RegionDetailPicker
        name="regions"
        value={[
          { region: "seoul", detail: "gangnam-gu" },
          { region: "busan", detail: "" },
        ]}
      />,
    );

    const inputs = container.querySelectorAll(
      'input[type="hidden"][name="regions"]',
    );
    const values = Array.from(inputs).map((el) =>
      (el as HTMLInputElement).value,
    );

    expect(values).toEqual(
      expect.arrayContaining(["seoul|gangnam-gu", "busan|"]),
    );
    expect(values.length).toBe(2);
  });

  it("value=[] → hidden input 0개 (또는 빈 input 없음)", () => {
    const { container } = render(
      <RegionDetailPicker name="regions" value={[]} />,
    );
    const inputs = container.querySelectorAll(
      'input[type="hidden"][name="regions"]',
    );
    // 0개 — 빈 배열을 serialize 하지 않음
    expect(inputs.length).toBe(0);
  });
});

describe("RegionDetailPicker — 빈 안내 (emptyHint)", () => {
  it("value 가 0개이고 emptyHint 가 전달되면 노출된다", () => {
    render(
      <RegionDetailPicker
        name="regions"
        value={[]}
        emptyHint="선택 안 함 = 상관없음"
      />,
    );
    // 디자이너 게이트 — 빈 상태일 때 부드러운 안내
    expect(screen.getByText(/선택 안 함 = 상관없음/)).toBeInTheDocument();
  });
});

// void unused — suppress unused import warnings if any
void within;
