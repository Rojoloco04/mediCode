alter table public.responder_accounts
  alter column auth_user_id drop not null;

alter table public.responder_accounts
  add column if not exists full_name text not null default '',
  add column if not exists work_email text not null default '',
  add column if not exists license_region text not null default '';

create unique index if not exists responder_accounts_work_email_idx
on public.responder_accounts (lower(work_email));

create policy "service role manages responder accounts"
on public.responder_accounts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
