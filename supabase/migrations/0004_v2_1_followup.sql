-- 0004_v2_1_followup.sql — V2.1 후속 정리 (PR #10 리뷰 코멘트 9건)
-- 결정 로그: docs/decisions/007-v2-1-review-followup.md
--
-- 변경 요약:
--   1. (D2) friend_ideals + 1:N 5개 테이블을 한 트랜잭션 안에서 갱신하는
--      `upsert_friend_ideal_aggregate(...)` Postgres function 신설.
--      Supabase JS 가 client 측 트랜잭션을 지원하지 않아 부분 실패 시 데이터 손상이
--      가능했던 5+1 순차 호출을 한 RPC 로 치환.
--   2. (D5) 0003 의 V1 컬럼 DROP (closeness/how_we_met/kakao_id/phone) 멱등성 가드 보강.
--      0003 직접 수정은 Supabase migration hash 추적과 충돌하므로 0004 에서 한 번 더
--      `drop column if exists` 형태로 재실행 안전성 회복. 이미 0003 으로 컬럼이 사라진
--      환경엔 사실상 no-op.

------------------------------------------------------------------
-- 1. D5 — V1 컬럼 DROP 멱등성 가드 (fresh install 시 재실행 안전성 회복)
------------------------------------------------------------------

alter table friends drop column if exists closeness;
alter table friends drop column if exists how_we_met;
alter table friends drop column if exists kakao_id;
alter table friends drop column if exists phone;

------------------------------------------------------------------
-- 2. D2 — friend_ideals 통합 upsert RPC
--
-- 한 트랜잭션 안에서:
--   1:1 friend_ideals 를 INSERT ... ON CONFLICT (friend_id) DO UPDATE
--   1:N 5개 테이블은 friend_id 기준 DELETE → INSERT (replace 패턴)
--
-- service-role 클라이언트에서만 호출 (앱 레이어 인가: assertOwnFriendRow 또는
-- requireOperator 가 선행). RLS deny-all 정책은 유지되며 RPC 자체가 service-role
-- 권한으로 실행되므로 별도 정책 부여 불필요.
--
-- security definer 는 사용하지 않는다 — 호출자가 이미 service-role 이라
-- 권한 상승 의도가 없고, definer 권한으로 노출하면 의도치 않은 elevated 호출
-- 경로가 생긴다. 그저 invoker 권한으로 실행.
------------------------------------------------------------------

create or replace function upsert_friend_ideal_aggregate(
  p_friend_id uuid,
  p_age_from smallint,
  p_age_to smallint,
  p_hometown_same_bonus boolean,
  p_smoking text,
  p_drinking text,
  p_marriage_timing text,
  p_tattoo text,
  p_free_text text,
  p_regions text[],
  p_hometowns text[],
  p_jobs text[],
  p_personality_keywords text[],
  p_priorities text[]
) returns void
language plpgsql
as $$
begin
  -- 1:1 friend_ideals 는 upsert.
  -- updated_at 은 column default `now()` (INSERT) + BEFORE UPDATE trigger
  -- `trg_friend_ideals_updated` (UPDATE) 가 자동 처리하므로 SET 절에서 명시 X.
  insert into friend_ideals (
    friend_id,
    age_from,
    age_to,
    hometown_same_bonus,
    smoking,
    drinking,
    marriage_timing,
    tattoo,
    free_text
  ) values (
    p_friend_id,
    p_age_from,
    p_age_to,
    p_hometown_same_bonus,
    p_smoking,
    p_drinking,
    p_marriage_timing,
    p_tattoo,
    p_free_text
  )
  on conflict (friend_id) do update set
    age_from = excluded.age_from,
    age_to = excluded.age_to,
    hometown_same_bonus = excluded.hometown_same_bonus,
    smoking = excluded.smoking,
    drinking = excluded.drinking,
    marriage_timing = excluded.marriage_timing,
    tattoo = excluded.tattoo,
    free_text = excluded.free_text;

  -- 1:N 5개: 한 친구 기준 DELETE 후 새 값을 INSERT (replace 패턴)
  delete from friend_ideal_regions where friend_id = p_friend_id;
  if p_regions is not null and array_length(p_regions, 1) is not null then
    insert into friend_ideal_regions (friend_id, region)
    select p_friend_id, unnest(p_regions);
  end if;

  delete from friend_ideal_hometowns where friend_id = p_friend_id;
  if p_hometowns is not null and array_length(p_hometowns, 1) is not null then
    insert into friend_ideal_hometowns (friend_id, hometown)
    select p_friend_id, unnest(p_hometowns);
  end if;

  delete from friend_ideal_jobs where friend_id = p_friend_id;
  if p_jobs is not null and array_length(p_jobs, 1) is not null then
    insert into friend_ideal_jobs (friend_id, job)
    select p_friend_id, unnest(p_jobs);
  end if;

  delete from friend_ideal_personality_keywords where friend_id = p_friend_id;
  if p_personality_keywords is not null
     and array_length(p_personality_keywords, 1) is not null then
    insert into friend_ideal_personality_keywords (friend_id, keyword)
    select p_friend_id, unnest(p_personality_keywords);
  end if;

  delete from friend_ideal_priorities where friend_id = p_friend_id;
  if p_priorities is not null and array_length(p_priorities, 1) is not null then
    -- priorities 는 (friend_id, category) UNIQUE 제약이 있어 중복 category 가
    -- 들어오면 RPC 전체 rollback. server-side dedup 으로 client 폼 버그·악성
    -- POST 모두 방어 — 같은 category 가 두 번 오면 먼저 등장한 ordinality 유지.
    insert into friend_ideal_priorities (friend_id, rank, category)
    select
      p_friend_id,
      row_number() over (order by first_seen)::smallint as rank,
      category
    from (
      select category, min(ordinality) as first_seen
      from unnest(p_priorities) with ordinality as t(category, ordinality)
      where category is not null
      group by category
    ) deduped
    order by first_seen
    limit 3;
  end if;
end;
$$;

-- defense in depth — Supabase 의 public schema 신규 function 은 anon/authenticated
-- 에게 기본 EXECUTE 가 부여된다. 실제 데이터 변경은 RLS deny-all 이 INSERT 단계에서
-- 막아 안전하지만, RPC POST 자체를 차단해 트랜잭션 진입 비용도 절약한다.
revoke execute on function upsert_friend_ideal_aggregate(
  uuid, smallint, smallint, boolean, text, text, text, text, text,
  text[], text[], text[], text[], text[]
) from anon, authenticated;
