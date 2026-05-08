-- Multi-operator support: all whitelisted operators share a single logical
-- "site owner" so they collaborate on the same friends/surveys/pairs.
--
-- The site_owner table holds exactly one row, populated lazily on the first
-- whitelisted operator's sign-in. Every subsequent whitelisted operator's
-- session resolves to the same owner_id, which is used everywhere the
-- existing schema's owner_id columns are set.

create table if not exists site_owner (
  id smallint primary key default 1,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint site_owner_singleton check (id = 1)
);

alter table site_owner enable row level security;
-- Deliberately no policies. Server-only access via service-role key.
