/**
 * V2 가입자 측 폼 (`/onboarding/*`, `/me/*`) 에서 공통 사용하는 옵션·라벨 사전.
 *
 * PRD §3.3.3 (이런 분이면 좋겠어요 3단 구조) 의 옵션·라벨 원본.
 * 이 모듈은:
 *   - 옵션 배열 (UI 컴포넌트 props 로 전달)
 *   - 라벨 lookup 객체 (운영자 측 표시·비교 뷰)
 *   - 옵션 값 → label 헬퍼
 * 를 제공한다.
 *
 * 도메인 타입 자체 (Friend / FriendStatus / SmokingPreference 등) 는
 * `lib/types/domain.ts` 가 single source. 여기서는 재export 하지 않고,
 * 사용처에서 `domain.ts` 에서 가져온다.
 */
import type {
  SmokingSelf,
  DrinkingSelf,
  MarriageViewSelf,
  TattooSelf,
} from "@/lib/types/domain";
// ─────────────────────────────────────────────────────────────
// §1 선호 조건 (구조화 8개 항목) — friend_ideals 1:1 + 다중선택 1:N
// ─────────────────────────────────────────────────────────────

// SmokingPreference / DrinkingPreference / MarriageTiming / TattooPreference 타입은
// `lib/types/domain.ts` 가 single source.
export const SMOKING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "non_smoker_only", label: "비흡연자만" },
] as const;

export const DRINKING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "often_ok", label: "자주 마셔도 OK" },
  { value: "sometimes_only", label: "가끔만 OK" },
  { value: "non_drinker_only", label: "안 마시는 사람만" },
] as const;

export const MARRIAGE_TIMING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "within_2y", label: "1~2년 내 결혼 생각" },
  { value: "over_3y", label: "3년 이상 천천히" },
  { value: "dating_focus", label: "지금은 연애 위주" },
] as const;

export const TATTOO_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "none_only", label: "없는 사람만" },
  { value: "small_ok", label: "작은 것 OK" },
] as const;

/** 광역시도 17개 — 거주지역·출신지역 다중 선택 */
export const REGION_OPTIONS = [
  { value: "seoul", label: "서울" },
  { value: "busan", label: "부산" },
  { value: "incheon", label: "인천" },
  { value: "daegu", label: "대구" },
  { value: "daejeon", label: "대전" },
  { value: "gwangju", label: "광주" },
  { value: "ulsan", label: "울산" },
  { value: "sejong", label: "세종" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "chungbuk", label: "충북" },
  { value: "chungnam", label: "충남" },
  { value: "jeonbuk", label: "전북" },
  { value: "jeonnam", label: "전남" },
  { value: "gyeongbuk", label: "경북" },
  { value: "gyeongnam", label: "경남" },
  { value: "jeju", label: "제주" },
] as const;
export type RegionCode = (typeof REGION_OPTIONS)[number]["value"];

/** 직업 대분류 — 다중 선택 */
export const JOB_OPTIONS = [
  { value: "office", label: "사무직" },
  { value: "professional", label: "전문직" },
  { value: "civil_servant", label: "공무원" },
  { value: "it_dev", label: "IT·개발" },
  { value: "art_creative", label: "예술·창작" },
  { value: "service", label: "서비스" },
  { value: "self_employed", label: "자영업" },
  { value: "student", label: "학생" },
  { value: "etc", label: "기타" },
] as const;
export type JobCategory = (typeof JOB_OPTIONS)[number]["value"];

// ─────────────────────────────────────────────────────────────
// §2 성격·결 — 키워드 15개 (다중 선택)
// ─────────────────────────────────────────────────────────────

export const PERSONALITY_KEYWORDS = [
  { value: "kind", label: "다정함" },
  { value: "humor", label: "유머" },
  { value: "serious", label: "진중함" },
  { value: "lively", label: "활발함" },
  { value: "calm", label: "차분함" },
  { value: "caring", label: "자상함" },
  { value: "smart", label: "똑똑함" },
  { value: "self_care", label: "자기관리" },
  { value: "stable", label: "안정적" },
  { value: "free_spirit", label: "자유로운" },
  { value: "responsible", label: "책임감" },
  { value: "sociable", label: "친화력" },
  { value: "honest", label: "솔직함" },
  { value: "considerate", label: "배려심" },
  { value: "curious", label: "호기심" },
] as const;
export type PersonalityKeyword = (typeof PERSONALITY_KEYWORDS)[number]["value"];

// ─────────────────────────────────────────────────────────────
// §3 매칭 우선순위 — 6개 카테고리, top 3 선택 (RankingPicker)
// ─────────────────────────────────────────────────────────────

// PriorityCategory 타입은 `lib/types/domain.ts` 가 single source.
export const PRIORITY_CATEGORIES = [
  {
    value: "appearance",
    label: "외모",
    emoji: "✨",
    description: "스타일·인상·체형 등",
  },
  {
    value: "personality",
    label: "성격",
    emoji: "💛",
    description: "결·말투·취향 합",
  },
  {
    value: "stability",
    label: "안정성",
    emoji: "🏠",
    description: "직업·경제·생활 패턴",
  },
  {
    value: "marriage_view",
    label: "결혼관",
    emoji: "💍",
    description: "결혼·아이·가정 그림",
  },
  {
    value: "values",
    label: "가치관",
    emoji: "🧭",
    description: "삶에서 중요하다고 보는 것",
  },
  {
    value: "lifestyle",
    label: "라이프스타일",
    emoji: "🌿",
    description: "취미·여가·일상 흐름",
  },
] as const;

// ─────────────────────────────────────────────────────────────
// 라벨 lookup helper — 단발 사용 (운영자 측 표시·비교 뷰)
// ─────────────────────────────────────────────────────────────

function toLookup<T extends { value: string; label: string }>(arr: readonly T[]) {
  return Object.fromEntries(arr.map((o) => [o.value, o.label])) as Record<
    string,
    string
  >;
}

export const REGION_LABEL = toLookup(REGION_OPTIONS);
export const JOB_LABEL = toLookup(JOB_OPTIONS);
export const PERSONALITY_KEYWORD_LABEL = toLookup(PERSONALITY_KEYWORDS);
export const PRIORITY_CATEGORY_LABEL = toLookup(PRIORITY_CATEGORIES);
export const SMOKING_LABEL = toLookup(SMOKING_OPTIONS);
export const DRINKING_LABEL = toLookup(DRINKING_OPTIONS);
export const MARRIAGE_TIMING_LABEL = toLookup(MARRIAGE_TIMING_OPTIONS);
export const TATTOO_LABEL = toLookup(TATTOO_OPTIONS);

// ─────────────────────────────────────────────────────────────
// 라벨 변환 helper — null/undefined/빈 → "", 매핑 미스 → raw value
// 008 §D3·D4 — 가입자 리스트/디테일 사이 정합성 (사용자 보고 "한글로 보이게").
// 페이지 본체는 이 helper 만 호출 (lookup 객체 직접 노출 ❌).
// ─────────────────────────────────────────────────────────────

function makeLabelGetter(lookup: Record<string, string>) {
  return function getLabel(value: string | null | undefined): string {
    if (value == null || value === "") return "";
    return lookup[value] ?? value;
  };
}

/** region 코드 → 한글 라벨 (광역시도 17개). 예: "gyeonggi" → "경기". */
export const getRegionLabel = makeLabelGetter(REGION_LABEL);

/** 출신지역 코드 → 한글 라벨. hometown 도 region 사전을 공유한다 (광역시도 17개). */
export const getHometownLabel = makeLabelGetter(REGION_LABEL);

/** 직업군 코드 → 한글 라벨. 예: "it_dev" → "IT·개발". */
export const getJobLabel = makeLabelGetter(JOB_LABEL);

// ─────────────────────────────────────────────────────────────
// 본인 프로필 4 항목 (009 — 자기 보고). 이상형 enum 셋과 분리.
//
// 이상형 enum 사전 (SMOKING_LABEL 등) 은 "any/non_smoker_only" 등
// "이상형 측 표현". 본인 프로필 enum 사전은 "non_smoker/occasional/regular"
// 등 "자기 상태". 의미 분리 명확히 위해 별 사전 + helper.
// (도메인 타입 import 는 파일 상단에 모음.)
// ─────────────────────────────────────────────────────────────

/** 본인 흡연 사전 — 자기 상태. 이상형 SMOKING_LABEL 과 분리. */
export const SELF_SMOKING_LABEL: Record<SmokingSelf, string> = {
  non_smoker: "비흡연",
  occasional: "가끔 핀다",
  regular: "자주 핀다",
};

/** 본인 음주 사전. */
export const SELF_DRINKING_LABEL: Record<DrinkingSelf, string> = {
  non_drinker: "안 마심",
  sometimes: "가끔",
  often: "자주",
};

/** 본인 결혼관 사전. */
export const SELF_MARRIAGE_VIEW_LABEL: Record<MarriageViewSelf, string> = {
  within_2y: "1~2년 내 결혼",
  over_3y: "3년 이후 결혼",
  dating_focus: "연애 위주",
};

/** 본인 문신 사전. */
export const SELF_TATTOO_LABEL: Record<TattooSelf, string> = {
  none: "없음",
  small: "작은 것",
  large: "큰·여러 개",
};

/** 본인 흡연 코드 → 한글. 이상형 enum (non_smoker_only) 는 raw fallback. */
export const getSmokingLabel = makeLabelGetter(SELF_SMOKING_LABEL);

/** 본인 음주 코드 → 한글. */
export const getDrinkingLabel = makeLabelGetter(SELF_DRINKING_LABEL);

/** 본인 결혼관 코드 → 한글. */
export const getMarriageViewLabel = makeLabelGetter(SELF_MARRIAGE_VIEW_LABEL);

/** 본인 문신 코드 → 한글. 이상형 enum (none_only) 는 raw fallback. */
export const getTattooLabel = makeLabelGetter(SELF_TATTOO_LABEL);

// 본인 프로필 폼 option 배열 (Select / RadioGroup 용).
// label 은 위 사전과 같은 텍스트를 그대로 재사용.
export const SELF_SMOKING_OPTIONS = [
  { value: "non_smoker", label: SELF_SMOKING_LABEL.non_smoker },
  { value: "occasional", label: SELF_SMOKING_LABEL.occasional },
  { value: "regular", label: SELF_SMOKING_LABEL.regular },
] as const;

export const SELF_DRINKING_OPTIONS = [
  { value: "non_drinker", label: SELF_DRINKING_LABEL.non_drinker },
  { value: "sometimes", label: SELF_DRINKING_LABEL.sometimes },
  { value: "often", label: SELF_DRINKING_LABEL.often },
] as const;

export const SELF_MARRIAGE_VIEW_OPTIONS = [
  { value: "within_2y", label: SELF_MARRIAGE_VIEW_LABEL.within_2y },
  { value: "over_3y", label: SELF_MARRIAGE_VIEW_LABEL.over_3y },
  { value: "dating_focus", label: SELF_MARRIAGE_VIEW_LABEL.dating_focus },
] as const;

export const SELF_TATTOO_OPTIONS = [
  { value: "none", label: SELF_TATTOO_LABEL.none },
  { value: "small", label: SELF_TATTOO_LABEL.small },
  { value: "large", label: SELF_TATTOO_LABEL.large },
] as const;

// ─────────────────────────────────────────────────────────────
// 출생연도 범위 (선호 나이대 RangeSlider 의 기본 범위)
// ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
export const BIRTH_YEAR_MIN = CURRENT_YEAR - 70; // ~70대 후반까지
export const BIRTH_YEAR_MAX = CURRENT_YEAR - 18; // 만 18+

// FRIEND_STATUS_LABEL 은 `lib/types/domain.ts` 에 있음 (재정의 제거).
