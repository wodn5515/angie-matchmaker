-- 0003_v2_self_signup.sql — V1 → V2 단절적 전환
-- 가입자(self-signup user) + 운영자 검토 모델로 데이터·인증·인가 기반 재구성.
-- 참고: docs/PRD.md §4 / docs/decisions/004 / docs/decisions/005 / docs/decisions/006
--
-- 변경 요약:
--   1. friends 확장 (auth_user_id / email / hometown / recommender_* / status / onboarding_step / rejected_reason)
--   2. friends V1 컬럼 제거 (closeness / how_we_met / kakao_id / phone)
--   3. friend_ideals 1:1 신설 (이상형 단일값 모음)
--   4. 다중선택 1:N 5개 신설 (regions / hometowns / jobs / personality_keywords / priorities)
--   5. survey_answers 키 변경 — (invitation_id, question_id) → (friend_id, question_id)
--   6. V1 토큰 흐름 테이블 폐기 — survey_invitations, friend_invitations
--
-- 적용 전제: V1 가입자 데이터 사실상 0 (decisions/005). survey_answers 토이 데이터는 비운다.

------------------------------------------------------------------
-- 1. V1 토큰 흐름 테이블 폐기
------------------------------------------------------------------

-- friend_invitations 는 다른 테이블이 참조하지 않으므로 그냥 DROP
drop table if exists friend_invitations cascade;

-- survey_answers.invitation_id 컬럼 + 그에 매달린 UNIQUE 제약 + survey_invitations 로의 FK
-- 를 한 번에 정리. (V1 키 (invitation_id, question_id) UNIQUE 도 함께 사라짐)
alter table survey_answers drop column invitation_id cascade;

-- 이제 survey_invitations 를 참조하는 외부 테이블이 없으므로 안전하게 DROP
drop table if exists survey_invitations cascade;

------------------------------------------------------------------
-- 2. friends V1 컬럼 제거
------------------------------------------------------------------

alter table friends drop column closeness;
alter table friends drop column how_we_met;
alter table friends drop column kakao_id;
alter table friends drop column phone;

------------------------------------------------------------------
-- 3. friends V2 컬럼 추가
------------------------------------------------------------------

-- OAuth 1:1 매핑. auth.users 가 삭제되면 friends row 도 같이 정리.
alter table friends
  add column auth_user_id uuid unique references auth.users(id) on delete cascade;

-- OAuth 가입 시 자동 확보되는 이메일
alter table friends add column email text;

-- 신규 거주/출신지역 분리
alter table friends add column hometown text;

-- 추천인 (가입 시 필수)
-- 기존 friends row 가 있을 수도 있으므로 DEFAULT '' 로 진입한 뒤 NOT NULL 유지.
-- V2 부터의 새 row 는 server action 에서 빈 문자열 거절.
alter table friends add column recommender_name text not null default '';
alter table friends add column recommender_relation text not null default '';

-- 심사 상태
alter table friends add column status text not null default 'pending'
  check (status in ('pending','approved','rejected'));

-- 운영자 비공개 메모 (가입자엔 노출 X)
alter table friends add column rejected_reason text;

-- 온보딩 진행 단계 (1=profile, 2=preferences, 3=survey, NULL=done)
alter table friends add column onboarding_step smallint
  check (onboarding_step is null or onboarding_step in (1,2,3));

create index if not exists friends_status_idx on friends(owner_id, status);
create index if not exists friends_auth_user_idx on friends(auth_user_id);

------------------------------------------------------------------
-- 4. friend_ideals 1:1 — 이상형 단일값
------------------------------------------------------------------

create table if not exists friend_ideals (
  friend_id uuid primary key references friends(id) on delete cascade,
  age_from smallint,
  age_to smallint,
  hometown_same_bonus boolean not null default false,
  smoking text check (smoking is null or smoking in ('any','non_smoker_only')),
  drinking text check (
    drinking is null or
    drinking in ('any','often_ok','sometimes_only','non_drinker_only')
  ),
  marriage_timing text check (
    marriage_timing is null or
    marriage_timing in ('any','within_2y','over_3y','dating_focus')
  ),
  tattoo text check (
    tattoo is null or tattoo in ('any','none_only','small_ok')
  ),
  free_text text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_friend_ideals_updated on friend_ideals;
create trigger trg_friend_ideals_updated
  before update on friend_ideals
  for each row execute function set_updated_at();

------------------------------------------------------------------
-- 5. 다중선택 1:N 5개
------------------------------------------------------------------

-- 선호 거주지역 (광역시도 다중)
create table if not exists friend_ideal_regions (
  friend_id uuid not null references friends(id) on delete cascade,
  region text not null,
  primary key (friend_id, region)
);

-- 선호 출신지역 (광역시도 다중)
create table if not exists friend_ideal_hometowns (
  friend_id uuid not null references friends(id) on delete cascade,
  hometown text not null,
  primary key (friend_id, hometown)
);

-- 선호 직업군 (대분류 다중)
create table if not exists friend_ideal_jobs (
  friend_id uuid not null references friends(id) on delete cascade,
  job text not null,
  primary key (friend_id, job)
);

-- 성격 키워드 (15개 중 다중)
create table if not exists friend_ideal_personality_keywords (
  friend_id uuid not null references friends(id) on delete cascade,
  keyword text not null,
  primary key (friend_id, keyword)
);

-- 매칭 우선순위 (6개 카테고리 중 top 3 — rank in (1,2,3), 한 카테고리는 한 rank 에만)
create table if not exists friend_ideal_priorities (
  friend_id uuid not null references friends(id) on delete cascade,
  rank smallint not null check (rank in (1,2,3)),
  category text not null check (
    category in ('appearance','personality','stability','marriage_view','values','lifestyle')
  ),
  primary key (friend_id, rank),
  unique (friend_id, category)
);

------------------------------------------------------------------
-- 6. survey_answers 신규 키 (friend_id, question_id)
------------------------------------------------------------------

-- V1 토이 답변 데이터 정리 후 새 키 적용
delete from survey_answers;

alter table survey_answers
  add column friend_id uuid not null references friends(id) on delete cascade;

alter table survey_answers
  add constraint survey_answers_friend_question_key unique (friend_id, question_id);

create index if not exists survey_answers_friend_idx on survey_answers(friend_id);

------------------------------------------------------------------
-- 7. RLS — V2 신규 테이블 deny-all (앱 레이어 인가 유지)
------------------------------------------------------------------

alter table friend_ideals enable row level security;
alter table friend_ideal_regions enable row level security;
alter table friend_ideal_hometowns enable row level security;
alter table friend_ideal_jobs enable row level security;
alter table friend_ideal_personality_keywords enable row level security;
alter table friend_ideal_priorities enable row level security;
