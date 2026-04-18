create extension if not exists pgcrypto;

create table if not exists public.patient_emergency_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_language text not null default 'en',
  full_name text not null,
  blood_type text not null default '',
  allergies jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  medications jsonb not null default '[]'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  manual_notes text not null default '',
  health_import_status text not null default 'notStarted',
  last_health_sync_at timestamptz,
  published_share_token_version integer not null default 0,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.responder_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('first_responder', 'triage_nurse')),
  organization_name text not null,
  credential_id_hash text not null,
  status text not null check (status in ('pending', 'active', 'suspended')),
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.emergency_share_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_emergency_profiles(id) on delete cascade,
  token_hash text not null unique,
  token_version integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.translation_cache (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_emergency_profiles(id) on delete cascade,
  profile_version integer not null,
  target_language_code text not null,
  translated_summary jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(patient_profile_id, profile_version, target_language_code)
);

create table if not exists public.responder_access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_emergency_profiles(id) on delete cascade,
  responder_account_id uuid not null references public.responder_accounts(id) on delete cascade,
  action text not null,
  target_language_code text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.patient_emergency_profiles enable row level security;
alter table public.responder_accounts enable row level security;
alter table public.emergency_share_tokens enable row level security;
alter table public.translation_cache enable row level security;
alter table public.responder_access_logs enable row level security;

create policy "patients manage own profiles"
on public.patient_emergency_profiles
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "responders read own account"
on public.responder_accounts
for select
using (auth.uid() = auth_user_id);

create policy "patients read logs for own profile"
on public.responder_access_logs
for select
using (
  exists (
    select 1
    from public.patient_emergency_profiles profiles
    where profiles.id = responder_access_logs.patient_profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

create policy "service role manages share tokens"
on public.emergency_share_tokens
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role manages translations"
on public.translation_cache
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role inserts access logs"
on public.responder_access_logs
for insert
with check (auth.role() = 'service_role');
