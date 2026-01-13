-- Enable UUIDs
create extension if not exists "pgcrypto";

-- Clean up (Nuke existing to ensure clean state)
drop table if exists receipts;
drop table if exists connections;
drop table if exists public_profiles;
drop type if exists receipt_status;

-- 1. Enums
create type receipt_status as enum (
  'AWAITING_SIGNUP',
  'AWAITING_CONNECTION',
  'AWAITING_ACCEPTANCE',
  'ACCEPTED',
  'REJECTED'
);

-- 2. Tables (Profiles)
create table public_profiles (
  user_id uuid references auth.users(id) primary key,
  email text not null,
  first_name text,
  last_name text,
  institution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Connections
create table connections (
  id uuid primary key default gen_random_uuid(),
  low_id uuid references auth.users(id) not null,
  high_id uuid references auth.users(id) not null,
  requested_by uuid references auth.users(id) not null,
  accepted boolean default false,
  requested_at timestamptz default now(),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_edge unique (low_id, high_id),
  constraint check_order check (low_id < high_id)
);

-- 4. Receipts
create table receipts (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references auth.users(id) not null,
  to_user_id uuid references auth.users(id), -- Nullable for AWAITING_SIGNUP
  recipient_email text not null,
  connection_id uuid references connections(id),
  tags text[],
  description text,
  is_public boolean default false,
  status receipt_status default 'AWAITING_SIGNUP',
  created_at timestamptz default now(),
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id)
);

-- 5. RLS (Row Level Security)
alter table public_profiles enable row level security;
alter table connections enable row level security;
alter table receipts enable row level security;

-- Policies
-- Profiles
create policy "Public profiles are viewable by everyone" on public_profiles for select using (true);
create policy "Users can update own profile" on public_profiles for update using (auth.uid() = user_id);
create policy "Users can insert own profile" on public_profiles for insert with check (auth.uid() = user_id);

-- Connections
-- View: If you are part of the connection
create policy "Connections viewable by involved parties" on connections for select using (auth.uid() = low_id or auth.uid() = high_id);
-- Insert: If you are the requester (and part of the pair - logic enforced by backend, but RLS double-check)
create policy "Connections insertable by requester" on connections for insert with check (auth.uid() = requested_by);
-- Update: If you are part of it
create policy "Connections modifiable by involved parties" on connections for update using (auth.uid() = low_id or auth.uid() = high_id);
-- Delete: If you are part of it
create policy "Connections deletable by involved parties" on connections for delete using (auth.uid() = low_id or auth.uid() = high_id);

-- Receipts
-- View: Sender, Recipient (ID match), or Recipient (Email match for new users)
create policy "Receipts viewable by sender/recipient" on receipts for select using (
  auth.uid() = from_user_id 
  or auth.uid() = to_user_id 
  or (to_user_id is null and lower(recipient_email) = lower(auth.jwt() ->> 'email'))
);
-- Insert: Sender only
create policy "Receipts insertable by sender" on receipts for insert with check (auth.uid() = from_user_id);
-- Update: Involved parties (Sender can cancel/archive? Recipient can accept/reject)
create policy "Receipts modifiable by involved" on receipts for update using (auth.uid() = from_user_id or auth.uid() = to_user_id);
