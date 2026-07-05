-- Overlap — Stage 2 schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run

create extension if not exists pgcrypto;

-- ROOMS ----------------------------------------------------------------
create table if not exists rooms (
  id text primary key,                 -- short room code, e.g. "7XQP3M"
  title text,
  status text not null default 'lobby' check (status in ('lobby', 'swiping', 'revealed')),
  host_client_id text not null,        -- localStorage client id of the creator
  matched_option_id uuid,              -- set when status = 'revealed'
  reveal_reason text check (reveal_reason in ('match', 'fallback', 'manual')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- PARTICIPANTS -----------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  client_id text not null,
  display_name text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, client_id)
);

-- OPTIONS (the swipeable items — replaces the old hardcoded dummy data) --
create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  image_type text not null default 'none' check (image_type in ('upload', 'ai', 'none')),
  created_by uuid references participants(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table rooms
  drop constraint if exists rooms_matched_option_id_fkey,
  add constraint rooms_matched_option_id_fkey
    foreign key (matched_option_id) references options(id) on delete set null;

-- SWIPES -------------------------------------------------------------
create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  option_id uuid not null references options(id) on delete cascade,
  direction text not null check (direction in ('like', 'skip')),
  created_at timestamptz not null default now(),
  unique (participant_id, option_id)
);

-- ROW LEVEL SECURITY -----------------------------------------------------
-- This MVP has no user accounts (by design — see the original plan).
-- Without accounts there's no auth.uid() to scope policies to, so real
-- isolation here comes from the room code being random and hard to guess,
-- not from RLS. These policies just make sure RLS is *on* (required for the
-- anon key to touch these tables at all) while allowing normal app reads/
-- writes. Tighten this later if you add real accounts (Supabase Auth).

alter table rooms enable row level security;
alter table participants enable row level security;
alter table options enable row level security;
alter table swipes enable row level security;

create policy "rooms: anyone can read" on rooms for select using (true);
create policy "rooms: anyone can create" on rooms for insert with check (true);
create policy "rooms: anyone can update status" on rooms for update using (true);

create policy "participants: anyone can read" on participants for select using (true);
create policy "participants: anyone can join" on participants for insert with check (true);
create policy "participants: anyone can update" on participants for update using (true);

create policy "options: anyone can read" on options for select using (true);
create policy "options: anyone can add" on options for insert with check (true);

create policy "swipes: anyone can read" on swipes for select using (true);
create policy "swipes: anyone can swipe" on swipes for insert with check (true);

-- REALTIME -----------------------------------------------------------
-- Lets the app subscribe to live changes (new participants, new options,
-- new swipes) instead of polling.
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table options;
alter publication supabase_realtime add table swipes;
alter publication supabase_realtime add table rooms;

-- STORAGE (for uploaded option images) --------------------------------
insert into storage.buckets (id, name, public)
values ('option-images', 'option-images', true)
on conflict (id) do nothing;

create policy "option-images: public read"
  on storage.objects for select
  using (bucket_id = 'option-images');

create policy "option-images: anyone can upload"
  on storage.objects for insert
  with check (bucket_id = 'option-images');
