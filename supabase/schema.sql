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
