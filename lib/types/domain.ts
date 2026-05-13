/**
 * matchmaker V2 도메인 타입.
 *
 * V1 의 운영자가 친구를 직접 등록하던 모델은 폐기되고, 자가 가입자 + 운영자 검토
 * 모델로 전환됨 (decisions/004 / PRD §1.1).
 *
 * V1 에서 제거된 friends 컬럼: closeness, how_we_met, kakao_id, phone.
 * V1 에서 추가된 friends 컬럼: auth_user_id, email, hometown, recommender_name,
 *   recommender_relation, status, rejected_reason, onboarding_step.
 *
 * V2 신규 테이블: friend_ideals 1:1 + friend_ideal_{regions,hometowns,jobs,
 *   personality_keywords,priorities} 5개.
 * V2 폐기 테이블: survey_invitations, friend_invitations.
 */

export type Gender = "male" | "female" | "other";
export type PreferredGender = "male" | "female" | "any";
export type RelationshipStatus =
  | "single"
  | "dating"
  | "married"
  | "complicated"
  | "unknown";
export type MatchInterest = "high" | "medium" | "low" | "none";
export type FriendStatus = "pending" | "approved" | "rejected";
export type OnboardingStep = 1 | 2 | 3 | null;

// 본인 프로필 4 항목 — 자기 상태 표현 (이상형 enum 과 분리).
// 결정 로그: docs/decisions/009-v2-self-traits.md §D1
export type SmokingSelf = "non_smoker" | "occasional" | "regular";
export type DrinkingSelf = "non_drinker" | "sometimes" | "often";
export type MarriageViewSelf = "within_2y" | "over_3y" | "dating_focus";
export type TattooSelf = "none" | "small" | "large";

export type Friend = {
  id: string;
  owner_id: string;
  // OAuth 가입자만 채워짐. 운영자가 직접 등록하던 V1 흐름 폐기 (운영자는 friends row 미보유).
  auth_user_id: string | null;
  email: string | null;
  // 가입자 본인 입력
  name: string;
  gender: Gender;
  preferred_gender: PreferredGender;
  // 권장 정보
  birth_year: number | null;
  region: string | null;
  /** 012 — 광역 region 의 구·시 세부. region 없이 detail 만 있는 상태는 CHECK 로 금지. */
  region_detail: string | null;
  hometown: string | null;
  hometown_detail: string | null;
  occupation: string | null;
  instagram: string | null;
  relationship_status: RelationshipStatus | null;
  match_interest: MatchInterest | null;
  // 자기 보고 4 항목 (009 — 이상형 매칭 대칭). 모두 선택 입력 / nullable.
  smoking: SmokingSelf | null;
  drinking: DrinkingSelf | null;
  marriage_view: MarriageViewSelf | null;
  tattoo: TattooSelf | null;
  // 추천인 (가입 시 필수 — server-side validation 으로 빈 문자열 거절)
  recommender_name: string;
  recommender_relation: string;
  // 심사 / 온보딩
  status: FriendStatus;
  rejected_reason: string | null;
  onboarding_step: OnboardingStep;
  // 운영자 큐레이션
  tags: string[] | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────────────────────────
// 이상형 (friend_ideals 1:1 + 1:N 5개)
// ──────────────────────────────────────────────────────────────

export type SmokingPreference = "any" | "non_smoker_only";
export type DrinkingPreference =
  | "any"
  | "often_ok"
  | "sometimes_only"
  | "non_drinker_only";
export type MarriageTiming = "any" | "within_2y" | "over_3y" | "dating_focus";
export type TattooPreference = "any" | "none_only" | "small_ok";
export type PriorityCategory =
  | "appearance"
  | "personality"
  | "stability"
  | "marriage_view"
  | "values"
  | "lifestyle";

export type FriendIdeals = {
  friend_id: string;
  age_from: number | null;
  age_to: number | null;
  hometown_same_bonus: boolean;
  smoking: SmokingPreference | null;
  drinking: DrinkingPreference | null;
  marriage_timing: MarriageTiming | null;
  tattoo: TattooPreference | null;
  free_text: string | null;
  updated_at: string;
};

export type FriendIdealRegion = { friend_id: string; region: string };
export type FriendIdealHometown = { friend_id: string; hometown: string };
export type FriendIdealJob = { friend_id: string; job: string };
export type FriendIdealKeyword = { friend_id: string; keyword: string };
export type FriendIdealPriority = {
  friend_id: string;
  rank: 1 | 2 | 3;
  category: PriorityCategory;
};

// ──────────────────────────────────────────────────────────────
// surveys / chapters / questions / answers
//   - surveys, survey_chapters, survey_questions: V1 그대로
//   - survey_answers: 키가 (invitation_id, question_id) → (friend_id, question_id)
//   - survey_invitations: 폐기 (V2 에서 토큰 흐름 사라짐)
// ──────────────────────────────────────────────────────────────

export type SurveyType = "standard" | "custom";

export type Survey = {
  id: string;
  owner_id: string;
  type: SurveyType;
  title: string;
  description: string | null;
  is_active: boolean;
  target_friend_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SurveyChapter = {
  id: string;
  survey_id: string;
  order_index: number;
  title: string;
  description: string | null;
  result_template: string | null;
};

export type QuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "likert"
  | "ranking"
  | "text";

export type LikertOptions = {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
};

export type ChoiceOptions = string[];
export type RankingOptions = string[];

export type QuestionOptions =
  | { kind: "choice"; options: ChoiceOptions }
  | { kind: "likert"; options: LikertOptions }
  | { kind: "ranking"; options: RankingOptions }
  | { kind: "text"; placeholder?: string };

export type SurveyQuestion = {
  id: string;
  chapter_id: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  options: unknown;
  required: boolean;
};

export type SurveyAnswerValue = string | string[] | number | null;

export type SurveyAnswer = {
  id: string;
  // V2: invitation_id 폐기, friend_id 로 키 변경 (PRD §4.6)
  friend_id: string;
  question_id: string;
  value: SurveyAnswerValue;
  updated_at: string;
};

// ──────────────────────────────────────────────────────────────
// pairs (V1 그대로 — 운영자 회고 노트장)
// ──────────────────────────────────────────────────────────────

export type PairOutcome = "good" | "bad" | "in_progress" | "unknown";

export type Pair = {
  id: string;
  owner_id: string;
  friend_a_id: string;
  friend_b_id: string;
  comparison_memo: string | null;
  introduced: boolean;
  introduced_at: string | null;
  outcome: PairOutcome | null;
  outcome_memo: string | null;
  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────────────────────────
// 라벨 lookup
// ──────────────────────────────────────────────────────────────

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  mcq_single: "객관식 (단일선택)",
  mcq_multi: "객관식 (다중선택)",
  likert: "점수 척도 (Likert)",
  ranking: "우선순위",
  text: "주관식",
};

export const RELATIONSHIP_STATUS_LABEL: Record<RelationshipStatus, string> = {
  single: "싱글",
  dating: "연애 중",
  married: "결혼",
  complicated: "복잡함",
  unknown: "모름",
};

export const MATCH_INTEREST_LABEL: Record<MatchInterest, string> = {
  high: "적극",
  medium: "보통",
  low: "소극",
  none: "관심 없음",
};

export const PAIR_OUTCOME_LABEL: Record<PairOutcome, string> = {
  good: "잘됨",
  bad: "별로",
  in_progress: "진행중",
  unknown: "모름",
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "남",
  female: "여",
  other: "기타",
};

export const PREFERRED_GENDER_LABEL: Record<PreferredGender, string> = {
  male: "남성",
  female: "여성",
  any: "상관없음",
};

export const FRIEND_STATUS_LABEL: Record<FriendStatus, string> = {
  pending: "심사 대기",
  approved: "승인됨",
  rejected: "거절됨",
};
