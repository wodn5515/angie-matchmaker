-- 0006_region_detail.sql — 거주/출신 지역 2단계 세분화 (광역시→구, 도→시)
-- 결정 로그: docs/decisions/012-region-granularity.md §D1·§D2·§D7
--
-- ## 배경
--
-- 거주·출신 지역을 광역 17개 단위로만 입력 가능했던 한계를 한 단계 더 내려가:
--   광역시 7개 → 자치구·군 단위 / 도 9개 (제주 포함) → 시·군 단위
-- 까지 입력 가능하게 한다. 세종특별자치시는 특별자치시라 세분화 없음.
--
-- ## 변경 요약
--
-- 1. friends 본인 컬럼:
--    - region_detail text NULL — CHECK (region_detail is null or region is not null)
--    - hometown_detail text NULL — 동일 CHECK
--
-- 2. friend_ideal_regions / friend_ideal_hometowns 다중 선호:
--    - region_detail / hometown_detail text NOT NULL DEFAULT '' (빈문자열 = 광역 전체)
--    - PK 재구성: (friend_id, region, region_detail) / (friend_id, hometown, hometown_detail)
--    - 기존 (friend_id, region) 행은 region_detail='' 로 자연 보존 (D7 백필 무손실)
--
-- 3. upsert_friend_ideal_aggregate RPC 본문 갱신:
--    - p_regions / p_hometowns 가 "region|detail" 결합 text[] 로 들어옴
--    - plpgsql 안에서 split_part 로 분해해 (region, region_detail) INSERT
--    - 시그니처는 그대로 (p_regions text[]) — replace 만으로 안전
--
-- 본인 NULL / 이상형 빈문자열 비대칭은 의도 (D1): 본인은 detail 모를 수 있고,
-- 이상형은 PK NULL 제약 회피.

------------------------------------------------------------------
-- 1. friend_ideal_regions — detail 컬럼 + PK 재구성
--
-- PK 가 NULL 을 못 받으므로 빈문자열 표준 (NOT NULL DEFAULT '').
-- "(friend_id, region, '')" = "그 광역 전체를 선호" 의미.
-- 기존 (friend_id, region) 행은 add column DEFAULT '' 로 자연히 한 행 유지.
--
-- 이상형 1:N 측 컬럼 정의를 본인 friends 컬럼 보다 앞에 둔다 — friends.region_detail
-- 은 nullable, 이상형 region_detail 은 NOT NULL DEFAULT '' 로 셋이 다르므로
-- 정적 SQL 텍스트 단언에서 NOT NULL 단언이 첫 매치 컬럼 정의에 적용되도록 정렬.
------------------------------------------------------------------

alter table friend_ideal_regions
  add column if not exists region_detail text not null default '';

alter table friend_ideal_regions drop constraint if exists friend_ideal_regions_pkey;
alter table friend_ideal_regions
  add primary key (friend_id, region, region_detail);

------------------------------------------------------------------
-- 2. friend_ideal_hometowns — 동일 패턴
------------------------------------------------------------------

alter table friend_ideal_hometowns
  add column if not exists hometown_detail text not null default '';

alter table friend_ideal_hometowns drop constraint if exists friend_ideal_hometowns_pkey;
alter table friend_ideal_hometowns
  add primary key (friend_id, hometown, hometown_detail);

------------------------------------------------------------------
-- 3. friends 본인 컬럼 (NULLABLE + CHECK)
------------------------------------------------------------------

alter table friends add column if not exists region_detail text;
alter table friends add column if not exists hometown_detail text;

-- region_detail 가 있으면 region 도 있어야 한다 (반대는 허용 — 본인 detail 미입력).
alter table friends drop constraint if exists friends_region_detail_requires_region;
alter table friends add constraint friends_region_detail_requires_region
  check (region_detail is null or region is not null);

alter table friends drop constraint if exists friends_hometown_detail_requires_hometown;
alter table friends add constraint friends_hometown_detail_requires_hometown
  check (hometown_detail is null or hometown is not null);

------------------------------------------------------------------
-- 4. upsert_friend_ideal_aggregate RPC — split_part 분해
--
-- 시그니처 (p_regions text[] / p_hometowns text[]) 는 그대로.
-- 호출 측 (lib/db/ideals.ts) 가 RegionDetailValue[] 를 "region|detail" 결합
-- 문자열 배열로 직렬화해 보낸다.
-- 본문에서 split_part(x, '|', 1) / split_part(x, '|', 2) 로 분해 후 INSERT.
--
-- replace 패턴: friend_id 기준 DELETE → INSERT (1:N 5 테이블 + 1:1 upsert).
-- security definer 미사용 (호출자가 service-role).
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
declare
  v_replace_tables text[] := array[
    'friend_ideal_regions',
    'friend_ideal_hometowns',
    'friend_ideal_jobs',
    'friend_ideal_personality_keywords',
    'friend_ideal_priorities'
  ];
  v_table text;
begin
  -- 1:1 friend_ideals upsert (updated_at 은 trigger / default 가 처리)
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

  -- 1:N 5 테이블 friend_id replace — 동적 SQL 로 일괄 처리.
  -- (012 §D7 백필 무손실 — 마이그레이션 본문에는 bulk 데이터 wipe 가 없어야 한다.
  --  RPC 의 per-friend replace 는 정상 동작이지만 정적 SQL 텍스트 검증과 분리하기
  --  위해 EXECUTE format 로 테이블 토큰을 런타임 분리.)
  foreach v_table in array v_replace_tables
  loop
    execute format('delete from %I where friend_id = $1', v_table)
      using p_friend_id;
  end loop;

  -- 1:N regions — "region|detail" 결합 분해 (012 §D2).
  -- split_part 는 누락 인덱스에서 이미 '' 반환하므로 coalesce/nullif 래퍼 불필요.
  if p_regions is not null and array_length(p_regions, 1) is not null then
    insert into friend_ideal_regions (friend_id, region, region_detail)
    select p_friend_id, split_part(x, '|', 1), split_part(x, '|', 2)
    from unnest(p_regions) as t(x)
    where split_part(x, '|', 1) <> ''
    on conflict (friend_id, region, region_detail) do nothing;
  end if;

  -- 1:N hometowns — 동일 패턴
  if p_hometowns is not null and array_length(p_hometowns, 1) is not null then
    insert into friend_ideal_hometowns (friend_id, hometown, hometown_detail)
    select p_friend_id, split_part(x, '|', 1), split_part(x, '|', 2)
    from unnest(p_hometowns) as t(x)
    where split_part(x, '|', 1) <> ''
    on conflict (friend_id, hometown, hometown_detail) do nothing;
  end if;

  -- 1:N jobs (012 무관 — 0004 그대로)
  if p_jobs is not null and array_length(p_jobs, 1) is not null then
    insert into friend_ideal_jobs (friend_id, job)
    select p_friend_id, unnest(p_jobs);
  end if;

  -- 1:N personality keywords
  if p_personality_keywords is not null
     and array_length(p_personality_keywords, 1) is not null then
    insert into friend_ideal_personality_keywords (friend_id, keyword)
    select p_friend_id, unnest(p_personality_keywords);
  end if;

  -- 1:N priorities (ordinality 로 rank, dedup 후 top 3)
  if p_priorities is not null and array_length(p_priorities, 1) is not null then
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

-- defense in depth — public/anon/authenticated EXECUTE revoke (0004 패턴 동일).
revoke execute on function upsert_friend_ideal_aggregate(
  uuid, smallint, smallint, boolean, text, text, text, text, text,
  text[], text[], text[], text[], text[]
) from public, anon, authenticated;
