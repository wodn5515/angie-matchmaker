-- friend_invitations: one-time tokens that let an unregistered friend
-- self-fill their own profile metadata. The operator generates a token
-- and hands the link to the friend; the friend submits the form, which
-- creates a friends row and marks the invitation as used.

create table if not exists friend_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  token text not null unique,
  -- Optional hint set by the operator before sending so they can
  -- recognize which slot they sent to whom.
  hint_name text,
  hint_note text,
  status text not null default 'pending'
    check (status in ('pending', 'used')),
  -- Resolved friend after submission (null while pending).
  friend_id uuid references friends(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists friend_invitations_owner_idx
  on friend_invitations(owner_id);
create index if not exists friend_invitations_status_idx
  on friend_invitations(owner_id, status);

alter table friend_invitations enable row level security;
-- Server-only access via the service-role key. No anon/auth policies.
