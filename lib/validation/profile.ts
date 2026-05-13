import { z } from "zod";

/**
 * 가입자 프로필 (V2 friends.* 일부) 유효성 검증 스키마.
 *
 * 온보딩 Step 1 (`/onboarding/profile`) 과 `/me/profile` 수정 양쪽에서 재사용.
 *
 * 필수: name / gender / preferred_gender / recommender_name / recommender_relation
 * 선택: birth_year / region / hometown / occupation / instagram /
 *       relationship_status / match_interest
 */
export const ProfileSchema = z.object({
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
  hometown: z
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

  const regions = formData.getAll("regions").map((v) => String(v)).filter(Boolean);
  const hometowns = formData.getAll("hometowns").map((v) => String(v)).filter(Boolean);
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
