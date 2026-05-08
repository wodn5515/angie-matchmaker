export type Gender = "male" | "female" | "other";
export type PreferredGender = "male" | "female" | "any";
export type RelationshipStatus =
  | "single"
  | "dating"
  | "married"
  | "complicated"
  | "unknown";
export type MatchInterest = "high" | "medium" | "low" | "none";

export type Friend = {
  id: string;
  owner_id: string;
  // Tier 1
  name: string;
  gender: Gender;
  preferred_gender: PreferredGender;
  // Tier 2
  birth_year: number | null;
  region: string | null;
  occupation: string | null;
  closeness: number | null; // 1~5
  how_we_met: string | null;
  tags: string[] | null;
  // Tier 3
  instagram: string | null;
  kakao_id: string | null;
  phone: string | null;
  notes: string | null;
  // Operator-set status
  relationship_status: RelationshipStatus | null;
  match_interest: MatchInterest | null;

  created_at: string;
  updated_at: string;
};

export type SurveyType = "standard" | "custom";

export type Survey = {
  id: string;
  owner_id: string;
  type: SurveyType;
  title: string;
  description: string | null;
  is_active: boolean;
  // Custom surveys may target a specific friend (informational only).
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
  // Stored as jsonb. Shape depends on type.
  options: unknown;
  required: boolean;
};

export type SurveyAnswerValue =
  | string // mcq_single, text
  | string[] // mcq_multi, ranking
  | number // likert
  | null;

export type SurveyAnswer = {
  id: string;
  invitation_id: string;
  question_id: string;
  value: SurveyAnswerValue;
  updated_at: string;
};

export type InvitationStatus = "pending" | "in_progress" | "completed";

export type SurveyInvitation = {
  id: string;
  token: string;
  friend_id: string;
  survey_id: string;
  status: InvitationStatus;
  created_at: string;
  completed_at: string | null;
};

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
