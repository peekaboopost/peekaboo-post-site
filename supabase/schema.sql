-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Creates the early-access waitlist table used by /api/subscribe.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

-- Lock the table down: only the server (service_role key) can read or write it.
alter table public.waitlist enable row level security;

-- RSVPs from customers' invites (one row per guest reply; latest reply wins per guest name).
create table if not exists public.rsvps (
  id bigint generated always as identity primary key,
  event_id text not null,
  invite text,
  guest_name text,
  attending text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rsvps_event_idx on public.rsvps (event_id, created_at desc);
alter table public.rsvps enable row level security;
