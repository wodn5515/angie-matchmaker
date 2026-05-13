import { z } from "zod";
import {
  REGION_OPTIONS,
  REGION_DETAIL_OPTIONS,
  type RegionCode,
} from "@/lib/types/v2-options";

/**
 * 012 nit #3 — server-side enum 검증 (defense-in-depth).
 * 클라이언트 폼이 정상 사전을 쓰면 자연 통과. raw POST 로 사전 외 값이 들어와도
 * 정합 복원 (region 자체는 reject — 의미 없는 광역 코드는 거부 안전, detail 은
 * normalize — 알 수 없는 detail 은 '광역만' 으로 떨어뜨려 silent fallback).
 */
const VALID_REGION_CODES: ReadonlySet<string> = new Set(
  REGION_OPTIONS.map((o) => o.value),
);

function isValidDetailFor(region: string, detail: string): boolean {
  const arr = REGION_DETAIL_OPTIONS[region as RegionCode];
  if (!arr) return false;
  return arr.some((d) => d.value === detail);
}

/**
 * 가입자 프로필 (V2 friends.* 일부) 유효성 검증 스키마.
 *
 * 온보딩 Step 1 (`/onboarding/profile`) 과 `/me/profile` 수정 양쪽에서 재사용.
 *
 * 필수: name / gender / preferred_gender / recommender_name / recommender_relation
 * 선택: birth_year / region / hometown / occupation / instagram /
 *       relationship_status / match_interest
 */
/**
 * Base 객체 스키마 — `.omit()` / `.pick()` 등 ZodObject 메서드가 필요한 호출처
 * (예: app/me/profile/actions.ts) 를 위해 별도로 export.
 * 일반 폼 제출은 아래의 ProfileSchema (transform 포함) 를 사용한다.
 */
export const ProfileObjectSchema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다").max(60),
  gender: z.enum(["male", "female", "other"]),
  preferred_gender: z.enum(["male", "female", "any"]),
  recommender_name: z
    .string()
    .trim()
    .min(1, "추천인 이름은 필수입니다")
    .max(80),
  recommender_relation: z
    .string()
    .trim()
    .min(1, "추천인과 어떻게 아는 사이인지 적어주세요")
    .max(120),
  birth_year: z
    .union([
      z.coerce.number().int().min(1900).max(new Date().getFullYear()),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  region: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  region_detail: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  hometown: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  hometown_detail: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  occupation: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  relationship_status: z
    .enum(["single", "dating", "married", "complicated", "unknown"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  match_interest: z
    .enum(["high", "medium", "low", "none"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  // 자기 보고 4 항목 (009). 모두 선택 입력 — 이상형 매칭 대칭에 사용.
  smoking: z
    .enum(["non_smoker", "occasional", "regular"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  drinking: z
    .enum(["non_drinker", "sometimes", "often"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  marriage_view: z
    .enum(["within_2y", "over_3y", "dating_focus"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  tattoo: z
    .enum(["none", "small", "large"])
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

/**
 * 012 §D1 CHECK 정합 + nit #3 server-side enum 검증.
 *
 * - region 자체가 사전 외 값이면 zod issue 추가 (reject).
 * - region_detail 가 그 region 의 사전 외 값이면 null 로 normalize.
 * - region 없이 detail 만 있는 경우 detail 을 null 로 정규화 (D1 CHECK 정합).
 * - hometown / hometown_detail 도 동일 패턴.
 */
export const ProfileSchema = ProfileObjectSchema.transform((data, ctx) => {
  if (data.region && !VALID_REGION_CODES.has(data.region)) {
    ctx.addIssue({
      code: "custom",
      path: ["region"],
      message: "알 수 없는 거주지역 코드입니다",
    });
  }
  if (data.hometown && !VALID_REGION_CODES.has(data.hometown)) {
    ctx.addIssue({
      code: "custom",
      path: ["hometown"],
      message: "알 수 없는 출신지역 코드입니다",
    });
  }

  const region_detail =
    data.region && data.region_detail && isValidDetailFor(data.region, data.region_detail)
      ? data.region_detail
      : null;
  const hometown_detail =
    data.hometown &&
    data.hometown_detail &&
    isValidDetailFor(data.hometown, data.hometown_detail)
      ? data.hometown_detail
      : null;

  return {
    ...data,
    // D1 CHECK 정합 — region 없으면 detail 도 null.
    region_detail: data.region ? region_detail : null,
    hometown_detail: data.hometown ? hometown_detail : null,
  };
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

/**
 * 이상형 폼 (V2 friend_ideals + 1:N 다섯 테이블) 유효성 검증 스키마.
 *
 * MultiSelectChip / RangeSlider / RankingPicker 가 form 직렬화해주는
 * hidden input 형식을 그대로 받아서 정규화한다.
 */
const IDEAL_SMOKING = ["", "any", "non_smoker_only"] as const;
const IDEAL_DRINKING = [
  "",
  "any",
  "often_ok",
  "sometimes_only",
  "non_drinker_only",
] as const;
const IDEAL_MARRIAGE = [
  "",
  "any",
  "within_2y",
  "over_3y",
  "dating_focus",
] as const;
const IDEAL_TATTOO = ["", "any", "none_only", "small_ok"] as const;
const PRIORITY_CATEGORIES = [
  "",
  "appearance",
  "personality",
  "stability",
  "marriage_view",
  "values",
  "lifestyle",
] as const;

export const PreferencesSchema = z.object({
  age_from: z
    .union([z.coerce.number().int().min(1900).max(new Date().getFullYear()), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  age_to: z
    .union([z.coerce.number().int().min(1900).max(new Date().getFullYear()), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
  hometown_same_bonus: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "on"),
  smoking: z.enum(IDEAL_SMOKING).optional().transform((v) => (v ? v : null)),
  drinking: z.enum(IDEAL_DRINKING).optional().transform((v) => (v ? v : null)),
  marriage_timing: z
    .enum(IDEAL_MARRIAGE)
    .optional()
    .transform((v) => (v ? v : null)),
  tattoo: z.enum(IDEAL_TATTOO).optional().transform((v) => (v ? v : null)),
  free_text: z
    .string()
    .max(300)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

/**
 * "region|detail" 결합 직렬화를 객체 배열로 normalize (012 §D2 + 디자이너 게이트).
 *
 * - 빈 값 / region 빈 토큰은 폐기 (input 0개 의도).
 * - "seoul" (파이프 없음) → { region: "seoul", detail: "" } 로 normalize.
 *   spec 의 두 정책 (reject vs normalize) 중 normalize 채택 — 사용자 입력 보존.
 * - "seoul|" → { region: "seoul", detail: "" }
 * - "seoul|gangnam-gu" → { region: "seoul", detail: "gangnam-gu" }
 *
 * 012 nit #3 — server-side enum 검증 (defense-in-depth):
 *  - region 이 REGION_OPTIONS 외 값이면 그 행 폐기 (raw POST 방어).
 *  - detail 이 해당 region 의 사전 외 값이면 detail '' 로 normalize (광역 전체로
 *    fallback). silent — UI 가 정상 사전을 쓰면 자연 통과.
 */
function parseRegionDetailList(
  values: FormDataEntryValue[],
): Array<{ region: string; detail: string }> {
  const out: Array<{ region: string; detail: string }> = [];
  for (const raw of values) {
    const str = String(raw);
    if (!str) continue;
    const idx = str.indexOf("|");
    const region = (idx === -1 ? str : str.slice(0, idx)).trim();
    const detail = (idx === -1 ? "" : str.slice(idx + 1)).trim();
    if (!region) continue;
    if (!VALID_REGION_CODES.has(region)) continue;
    const safeDetail =
      detail === "" || isValidDetailFor(region, detail) ? detail : "";
    out.push({ region, detail: safeDetail });
  }
  return out;
}

/**
 * FormData → PreferencesSchema 입력 + 멀티값 배열 + 우선순위 배열 추출.
 * MultiSelectChip 은 같은 name 으로 여러 hidden input 을 생성해 `getAll(name)` 으로 받는다.
 * RankingPicker 는 `${name}_rank_1`/`_rank_2`/`_rank_3` 3개 hidden input.
 */
export function parsePreferencesFormData(formData: FormData) {
  const scalar = PreferencesSchema.parse({
    age_from: formData.get("age_from") ?? "",
    age_to: formData.get("age_to") ?? "",
    hometown_same_bonus: formData.get("hometown_same_bonus") ?? "",
    smoking: formData.get("smoking") ?? "",
    drinking: formData.get("drinking") ?? "",
    marriage_timing: formData.get("marriage_timing") ?? "",
    tattoo: formData.get("tattoo") ?? "",
    free_text: formData.get("free_text") ?? "",
  });

  // 012 — region/hometown 은 "region|detail" 결합 직렬화 (디자이너 게이트).
  // split('|') 첫 토큰 = region, 두 번째 = detail (없으면 '' 광역 전체).
  // 잘못된 형식 ('|' 없는 raw) 은 detail='' 로 normalize (worker 자율 정책).
  const regions = parseRegionDetailList(formData.getAll("regions"));
  const hometowns = parseRegionDetailList(formData.getAll("hometowns"));
  const jobs = formData.getAll("jobs").map((v) => String(v)).filter(Boolean);
  const personality_keywords = formData
    .getAll("personality_keywords")
    .map((v) => String(v))
    .filter(Boolean);

  // 우선순위 — top 3
  const priorities = [
    formData.get("priorities_rank_1"),
    formData.get("priorities_rank_2"),
    formData.get("priorities_rank_3"),
  ]
    .map((v) => (v == null ? "" : String(v)))
    .filter((v) => (PRIORITY_CATEGORIES as readonly string[]).includes(v) && v !== "");

  return { ...scalar, regions, hometowns, jobs, personality_keywords, priorities };
}
