-- Matchmaker — Initial schema
-- Single-operator design. owner_id columns prepare for future multi-tenant.

create extension if not exists "pgcrypto";

------------------------------------------------------------------
-- friends
------------------------------------------------------------------
create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  -- Tier 1
  name text not null,
  gender text not null check (gender in ('male','female','other')),
  preferred_gender text not null check (preferred_gender in ('male','female','any')),
  -- Tier 2
  birth_year int,
  region text,
  occupation text,
  closeness int check (closeness is null or (closeness between 1 and 5)),
  how_we_met text,
  tags text[] default '{}',
  -- Tier 3
  instagram text,
  kakao_id text,
  phone text,
  notes text,
  -- Operator-set status
  relationship_status text check (
    relationship_status is null or
    relationship_status in ('single','dating','married','complicated','unknown')
  ),
  match_interest text check (
    match_interest is null or
    match_interest in ('high','medium','low','none')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists friends_owner_idx on friends(owner_id);
create index if not exists friends_name_idx on friends(name);

------------------------------------------------------------------
-- surveys
------------------------------------------------------------------
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  type text not null check (type in ('standard','custom')),
  title text not null,
  description text,
  is_active boolean not null default true,
  target_friend_id uuid references friends(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists surveys_owner_idx on surveys(owner_id);
-- At most one active standard survey per owner.
create unique index if not exists surveys_one_standard_per_owner
  on surveys(owner_id)
  where (type = 'standard' and is_active = true);

------------------------------------------------------------------
-- survey_chapters
------------------------------------------------------------------
create table if not exists survey_chapters (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  order_index int not null default 0,
  title text not null,
  description text,
  result_template text
);
create index if not exists survey_chapters_survey_idx
  on survey_chapters(survey_id, order_index);

------------------------------------------------------------------
-- survey_questions
------------------------------------------------------------------
create table if not exists survey_questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references survey_chapters(id) on delete cascade,
  order_index int not null default 0,
  type text not null check (
    type in ('mcq_single','mcq_multi','likert','ranking','text')
  ),
  prompt text not null,
  options jsonb,
  required boolean not null default false
);
create index if not exists survey_questions_chapter_idx
  on survey_questions(chapter_id, order_index);

------------------------------------------------------------------
-- survey_invitations (1회용 토큰)
------------------------------------------------------------------
create table if not exists survey_invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  friend_id uuid not null references friends(id) on delete cascade,
  survey_id uuid not null references surveys(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists survey_invitations_friend_idx
  on survey_invitations(friend_id);
create index if not exists survey_invitations_survey_idx
  on survey_invitations(survey_id);
create index if not exists survey_invitations_status_idx
  on survey_invitations(status);

------------------------------------------------------------------
-- survey_answers
------------------------------------------------------------------
create table if not exists survey_answers (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references survey_invitations(id) on delete cascade,
  question_id uuid not null references survey_questions(id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (invitation_id, question_id)
);
create index if not exists survey_answers_invitation_idx
  on survey_answers(invitation_id);

------------------------------------------------------------------
-- pairs (비교 메모 + 매칭 이력 통합)
------------------------------------------------------------------
create table if not exists pairs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  friend_a_id uuid not null references friends(id) on delete cascade,
  friend_b_id uuid not null references friends(id) on delete cascade,
  comparison_memo text,
  introduced boolean not null default false,
  introduced_at timestamptz,
  outcome text check (
    outcome is null or outcome in ('good','bad','in_progress','unknown')
  ),
  outcome_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Canonical ordering: friend_a_id < friend_b_id
  constraint pairs_canonical_order check (friend_a_id < friend_b_id),
  unique (friend_a_id, friend_b_id)
);
create index if not exists pairs_owner_idx on pairs(owner_id);
create index if not exists pairs_introduced_idx on pairs(owner_id, introduced);

------------------------------------------------------------------
-- updated_at trigger function (shared)
------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_friends_updated on friends;
create trigger trg_friends_updated
  before update on friends
  for each row execute function set_updated_at();

drop trigger if exists trg_surveys_updated on surveys;
create trigger trg_surveys_updated
  before update on surveys
  for each row execute function set_updated_at();

drop trigger if exists trg_pairs_updated on pairs;
create trigger trg_pairs_updated
  before update on pairs
  for each row execute function set_updated_at();

drop trigger if exists trg_answers_updated on survey_answers;
create trigger trg_answers_updated
  before update on survey_answers
  for each row execute function set_updated_at();

------------------------------------------------------------------
-- Row-Level Security
-- Strategy: server-only writes via service-role key. Block anon access entirely.
-- The friend-facing survey page uses a special "by-token" RPC (see 0002) so that
-- anon clients don't need direct table access.
------------------------------------------------------------------
alter table friends enable row level security;
alter table surveys enable row level security;
alter table survey_chapters enable row level security;
alter table survey_questions enable row level security;
alter table survey_invitations enable row level security;
alter table survey_answers enable row level security;
alter table pairs enable row level security;

-- No policies = no anon/auth access. Only service-role bypasses RLS.
