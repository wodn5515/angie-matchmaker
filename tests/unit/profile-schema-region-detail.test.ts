/**
 * lib/validation/profile.ts — region_detail / hometown_detail 추가 + Preferences FormData
 * 의 "region|detail" 결합 직렬화 파싱.
 *
 * 결정 로그: docs/decisions/012-region-granularity.md §D1·§D2 + "디자이너 게이트 결과"
 *
 * ## 검증 포인트
 *
 * 1. ProfileSchema 가 region_detail / hometown_detail 컬럼을 수용한다
 *    - region 만 / region+detail 둘 다 / detail 만 (region 없이) — D1 의 CHECK 정합:
 *      "region_detail is not null and region is null" 이면 reject 또는 detail null 강제.
 *    - worker 자율 정책 — 본 spec 은 "raise 또는 normalize 후 detail null" 둘 다 허용,
 *      "둘 다 빈/null 인 row 가 parse 통과" 만 강제 검증.
 *
 * 2. parsePreferencesFormData 가 hidden input "regions"="seoul|" + "regions"="busan|haeundae-gu"
 *    형태를 [{ region, detail }] 객체 배열로 정규화한다 (디자이너 게이트 — D2 RPC 정합).
 *
 * 3. 잘못된 형식 ('|' 없는 raw value) 정책 — worker 자율로
 *    (a) reject 하거나
 *    (b) detail '' 로 normalize 둘 중 하나 채택.
 *    spec 은 (b) 채택 시 ("seoul" 단독 → {region:"seoul", detail:""}) 도 통과하게 작성.
 *    이유: D2 의 "split 후 빈 detail" 자연 케이스 와 같은 의미.
 */

import { describe, expect, it } from "vitest";
import { ProfileSchema, parsePreferencesFormData } from "@/lib/validation/profile";

describe("ProfileSchema — region_detail / hometown_detail 컬럼 추가", () => {
  it("region 만 채운 경우 — region_detail 없이도 parse 통과", () => {
    const out = ProfileSchema.parse({
      name: "홍길동",
      gender: "male",
      preferred_gender: "female",
      recommender_name: "김영희",
      recommender_relation: "대학 동기",
      region: "seoul",
    });
    expect(out.region).toBe("seoul");
    // region_detail 필드가 존재하면 null/undefined 둘 다 허용 — D1 의 "region only" 케이스.
    const rd = (out as { region_detail?: string | null }).region_detail;
    expect(rd == null).toBe(true);
  });

  it("region + region_detail 둘 다 채운 경우 — parse 통과 + 둘 다 보존", () => {
    const out = ProfileSchema.parse({
      name: "홍길동",
      gender: "male",
      preferred_gender: "female",
      recommender_name: "김영희",
      recommender_relation: "대학 동기",
      region: "seoul",
      region_detail: "gangnam-gu",
    });
    expect(out.region).toBe("seoul");
    expect((out as { region_detail: string | null }).region_detail).toBe(
      "gangnam-gu",
    );
  });

  it("hometown + hometown_detail 둘 다 채운 경우 — parse 통과 + 둘 다 보존", () => {
    const out = ProfileSchema.parse({
      name: "홍길동",
      gender: "male",
      preferred_gender: "female",
      recommender_name: "김영희",
      recommender_relation: "대학 동기",
      hometown: "busan",
      hometown_detail: "haeundae-gu",
    });
    expect(out.hometown).toBe("busan");
    expect((out as { hometown_detail: string | null }).hometown_detail).toBe(
      "haeundae-gu",
    );
  });

  it("region 없이 region_detail 만 채운 경우 — reject 또는 detail null 로 normalize (D1 CHECK 정합)", () => {
    // D1: friends_region_detail_requires_region CHECK — region 없으면 detail 도 NULL.
    // 정책 두 가지 모두 허용:
    //   (a) throw (zod refine reject)
    //   (b) parse 통과하되 region_detail 가 null 로 normalize
    let threw = false;
    let detailAfter: unknown = undefined;
    try {
      const out = ProfileSchema.parse({
        name: "홍길동",
        gender: "male",
        preferred_gender: "female",
        recommender_name: "김영희",
        recommender_relation: "대학 동기",
        region_detail: "gangnam-gu", // region 없이
      });
      detailAfter = (out as { region_detail?: string | null }).region_detail;
    } catch {
      threw = true;
    }

    if (threw) {
      // (a) reject 채택 — 정상.
      expect(threw).toBe(true);
    } else {
      // (b) normalize 채택 — region_detail 가 null 이어야 D1 CHECK 와 정합.
      expect(detailAfter == null).toBe(true);
    }
  });

  it("region / region_detail / hometown / hometown_detail 모두 비어도 parse 통과 (모두 선택)", () => {
    const out = ProfileSchema.parse({
      name: "홍길동",
      gender: "male",
      preferred_gender: "female",
      recommender_name: "김영희",
      recommender_relation: "대학 동기",
    });
    // 기존 spec 회귀 유지 — region/hometown 비워도 통과.
    expect(out.region).toBeNull();
    expect(out.hometown).toBeNull();
  });
});

describe("parsePreferencesFormData — 'region|detail' 결합 직렬화 파싱 (디자이너 게이트)", () => {
  it("regions=[seoul|, busan|haeundae-gu] → [{region:'seoul', detail:''}, {region:'busan', detail:'haeundae-gu'}]", () => {
    const fd = new FormData();
    fd.append("regions", "seoul|");
    fd.append("regions", "busan|haeundae-gu");

    const out = parsePreferencesFormData(fd);
    expect(out.regions).toEqual(
      expect.arrayContaining([
        { region: "seoul", detail: "" },
        { region: "busan", detail: "haeundae-gu" },
      ]),
    );
    expect(out.regions.length).toBe(2);
  });

  it("hometowns 도 동일 직렬화 — [gyeonggi|, jeju|jeju-si]", () => {
    const fd = new FormData();
    fd.append("hometowns", "gyeonggi|");
    fd.append("hometowns", "jeju|jeju-si");

    const out = parsePreferencesFormData(fd);
    expect(out.hometowns).toEqual(
      expect.arrayContaining([
        { region: "gyeonggi", detail: "" },
        { region: "jeju", detail: "jeju-si" },
      ]),
    );
    expect(out.hometowns.length).toBe(2);
  });

  it("regions 빈 FormData → 빈 배열", () => {
    const fd = new FormData();
    const out = parsePreferencesFormData(fd);
    expect(out.regions).toEqual([]);
    expect(out.hometowns).toEqual([]);
  });

  it("regions=[seoul|gangnam-gu, seoul|seocho-gu] → 동일 region 두 행 보존", () => {
    const fd = new FormData();
    fd.append("regions", "seoul|gangnam-gu");
    fd.append("regions", "seoul|seocho-gu");

    const out = parsePreferencesFormData(fd);
    expect(out.regions).toEqual(
      expect.arrayContaining([
        { region: "seoul", detail: "gangnam-gu" },
        { region: "seoul", detail: "seocho-gu" },
      ]),
    );
    expect(out.regions.length).toBe(2);
  });

  it("잘못된 형식 — '|' 없는 raw value 'seoul' (정책 자율: reject 또는 detail='' normalize)", () => {
    const fd = new FormData();
    fd.append("regions", "seoul"); // '|' 없음

    let threw = false;
    let regionsAfter: Array<{ region: string; detail: string }> = [];
    try {
      const out = parsePreferencesFormData(fd);
      regionsAfter = out.regions;
    } catch {
      threw = true;
    }

    if (threw) {
      // (a) reject 채택 — 잘못된 직렬화는 거절.
      expect(threw).toBe(true);
    } else {
      // (b) normalize 채택 — split 후 빈 detail 처리.
      expect(regionsAfter).toEqual([{ region: "seoul", detail: "" }]);
    }
  });
});
