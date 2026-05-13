import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * 이상형 비교 유틸 + DB 헬퍼.
 *
 * 핵심 함수 `compareIdealValues` 는 한 항목 단위로 "이상형 vs 상대 프로필" 일치도를
 * 4종 (same/partial/different/neutral) 으로 분류한다. 비교 뷰 (PRD §3.4.2 / §6.5)
 * 의 색상 단서가 이 결과를 그대로 매핑한다.
 *
 * "단일 enum" / "다중선택 배열" / "출생연도 from-to 범위" 세 가지 비교 모양만 다루며,
 * 도메인 별 enum 매핑(예: smoking "non_smoker_only" → "non_smoker") 은 `_only` 접미사
 * 표준화로 처리한다.
 */

export type IdealMatchKind = "same" | "partial" | "different" | "neutral";

type CompareArgs = {
  /**
   * 이상형 값. kind 에 따라:
   *   - single: string (enum) or "any"
   *   - multi: string[] | string  (배열이 정석)
   *   - year_range: { from: number | null; to: number | null }
   */
  ideal: unknown;
  /**
   * 상대 프로필 값. kind 에 따라:
   *   - single: string (상대의 enum value)
   *   - multi: string | string[]  (단일 또는 배열 둘 다 허용)
   *   - year_range: number (birth_year)
   */
  profile: unknown;
  kind: "single" | "multi" | "year_range";
};

function stripIdealSuffix(s: string): string {
  // smoking 같은 "_only" 접미사가 붙은 이상형 enum 을 프로필 enum 으로 정규화.
  // 예: "non_smoker_only" → "non_smoker". 접미사가 없으면 그대로.
  return s.endsWith("_only") ? s.slice(0, -"_only".length) : s;
}

export function compareIdealValues(args: CompareArgs): IdealMatchKind {
  const { ideal, profile, kind } = args;

  // === Neutral: 이상형 미설정 / "any" / 빈 배열 / 범위 양쪽 null ===
  if (ideal == null) return "neutral";
  if (ideal === "any") return "neutral";
  if (kind === "multi" && Array.isArray(ideal) && ideal.length === 0) {
    return "neutral";
  }
  if (
    kind === "year_range" &&
    typeof ideal === "object" &&
    ideal !== null &&
    !Array.isArray(ideal)
  ) {
    const r = ideal as { from: number | null; to: number | null };
    if (r.from == null && r.to == null) return "neutral";
  }

  // 상대 프로필이 미응답이면 비교 불가 → neutral
  if (profile == null) return "neutral";

  if (kind === "single") {
    const idealStr = String(ideal);
    const profileStr = String(profile);
    if (idealStr === profileStr) return "same";
    if (stripIdealSuffix(idealStr) === profileStr) return "same";
    return "different";
  }

  if (kind === "multi") {
    const idealArr = (
      Array.isArray(ideal) ? ideal : [ideal]
    ).map((v) => String(v));
    const idealSet = new Set(idealArr);

    if (Array.isArray(profile)) {
      if (profile.length === 0) return "neutral";
      const profileArr = profile.map((p) => String(p));
      const allIncluded = profileArr.every((p) => idealSet.has(p));
      if (allIncluded) return "same";
      const anyIncluded = profileArr.some((p) => idealSet.has(p));
      return anyIncluded ? "partial" : "different";
    }
    return idealSet.has(String(profile)) ? "same" : "different";
  }

  if (kind === "year_range") {
    if (typeof ideal !== "object" || ideal === null || Array.isArray(ideal)) {
      return "neutral";
    }
    const r = ideal as { from: number | null; to: number | null };
    const p = typeof profile === "number" ? profile : Number(profile);
    if (!Number.isFinite(p)) return "neutral";
    if (r.from != null && r.to != null) {
      return p >= r.from && p <= r.to ? "same" : "different";
    }
    if (r.from != null) {
      return p >= r.from ? "partial" : "different";
    }
    if (r.to != null) {
      return p <= r.to ? "partial" : "different";
    }
    return "neutral";
  }

  return "neutral";
}

// ──────────────────────────────────────────────────────────────
// DB 헬퍼 — friend_ideals 1:1 + 1:N 다섯 테이블 fetch / upsert
// ──────────────────────────────────────────────────────────────

export type FriendIdealsRow = {
  friend_id: string;
  age_from: number | null;
  age_to: number | null;
  hometown_same_bonus: boolean;
  smoking: string | null;
  drinking: string | null;
  marriage_timing: string | null;
  tattoo: string | null;
  free_text: string | null;
  updated_at: string;
};

export type FriendIdealAggregate = {
  ideals: FriendIdealsRow | null;
  regions: string[];
  hometowns: string[];
  jobs: string[];
  personality_keywords: string[];
  /** rank 1..3 순서로 정렬된 카테고리 배열. */
  priorities: string[];
};

/**
 * 한 가입자의 이상형 1:1 + 1:N 5개를 한 번에 fetch.
 * 모든 fetch 는 service-role client (RLS 우회). 가입자 측에서 호출하기 전엔
 * 반드시 `assertOwnFriendRow()` 또는 운영자 인증이 선행되어야 한다.
 */
export async function getFriendIdealAggregate(
  friendId: string,
): Promise<FriendIdealAggregate> {
  const sb = createSupabaseServiceClient();
  const [
    idealsRes,
    regionsRes,
    hometownsRes,
    jobsRes,
    keywordsRes,
    prioritiesRes,
  ] = await Promise.all([
    sb.from("friend_ideals").select("*").eq("friend_id", friendId).maybeSingle(),
    sb.from("friend_ideal_regions").select("region").eq("friend_id", friendId),
    sb
      .from("friend_ideal_hometowns")
      .select("hometown")
      .eq("friend_id", friendId),
    sb.from("friend_ideal_jobs").select("job").eq("friend_id", friendId),
    sb
      .from("friend_ideal_personality_keywords")
      .select("keyword")
      .eq("friend_id", friendId),
    sb
      .from("friend_ideal_priorities")
      .select("rank, category")
      .eq("friend_id", friendId)
      .order("rank", { ascending: true }),
  ]);

  if (idealsRes.error) throw idealsRes.error;
  if (regionsRes.error) throw regionsRes.error;
  if (hometownsRes.error) throw hometownsRes.error;
  if (jobsRes.error) throw jobsRes.error;
  if (keywordsRes.error) throw keywordsRes.error;
  if (prioritiesRes.error) throw prioritiesRes.error;

  return {
    ideals: (idealsRes.data as FriendIdealsRow | null) ?? null,
    regions: (regionsRes.data ?? []).map((r) => r.region as string),
    hometowns: (hometownsRes.data ?? []).map((r) => r.hometown as string),
    jobs: (jobsRes.data ?? []).map((r) => r.job as string),
    personality_keywords: (keywordsRes.data ?? []).map(
      (r) => r.keyword as string,
    ),
    priorities: (prioritiesRes.data ?? []).map((r) => r.category as string),
  };
}

export type FriendIdealsUpsertInput = {
  friendId: string;
  age_from: number | null;
  age_to: number | null;
  hometown_same_bonus: boolean;
  smoking: string | null;
  drinking: string | null;
  marriage_timing: string | null;
  tattoo: string | null;
  free_text: string | null;
  regions: string[];
  hometowns: string[];
  jobs: string[];
  personality_keywords: string[];
  /** rank 1..3 순서대로 길이 0~3 의 카테고리 배열. */
  priorities: string[];
};

/**
 * friend_ideals + 1:N 5개 테이블을 한 번에 갱신.
 *
 * 한 plpgsql function `upsert_friend_ideal_aggregate` 을 RPC 로 호출해 모든 변경을
 * 한 트랜잭션으로 묶는다 (decisions/007 §D2 + supabase/migrations/0004_v2_1_followup.sql).
 * 부분 실패 시 데이터 손상이 가능했던 5+1 client 측 순차 호출을 단일 RTT 로 대체.
 *
 * 외부 시그니처는 유지 — 호출 측 (server actions / 운영자 폼) 영향 없음.
 */
export async function upsertFriendIdealAggregate(
  input: FriendIdealsUpsertInput,
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.rpc("upsert_friend_ideal_aggregate", {
    p_friend_id: input.friendId,
    p_age_from: input.age_from,
    p_age_to: input.age_to,
    p_hometown_same_bonus: input.hometown_same_bonus,
    p_smoking: input.smoking,
    p_drinking: input.drinking,
    p_marriage_timing: input.marriage_timing,
    p_tattoo: input.tattoo,
    p_free_text: input.free_text,
    p_regions: input.regions,
    p_hometowns: input.hometowns,
    p_jobs: input.jobs,
    p_personality_keywords: input.personality_keywords,
    // priorities 는 SQL function 안에서 ordinality 로 rank 를 부여하므로 상위 3개만 전달.
    p_priorities: input.priorities.slice(0, 3),
  });
  if (error) throw error;
}
