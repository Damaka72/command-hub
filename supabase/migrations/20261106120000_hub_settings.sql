-- Migration: hub_settings
-- Version:  20261106120000
--
-- A small key/value store for things Didi edits directly on the Command Hub
-- home page and that must follow her across laptop, iPad and phone. First user:
-- key 'faith' (Word for Today, prayer points, fast focus, reading override).
-- Later sections can add their own keys without a new table.
--
-- NOT YET APPLIED. Apply to the 'The Old Oak Town' Supabase project (the one
-- actions_log and tracker_task_state live in) before the faith edits will save
-- across devices. Until then the Hub keeps edits in the browser and says so.
--
-- Idempotent, and anon holds read + write like the other Hub tables: the Hub is
-- gated app-wide by proxy.ts and reaches Supabase with the anon key.

create table if not exists public.hub_settings (
  key         text        primary key,
  value       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table public.hub_settings is
  'Free-form settings edited on the Command Hub home page, one row per key (e.g. faith).';

alter table public.hub_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hub_settings' and policyname='anon read hub_settings') then
    create policy "anon read hub_settings"   on public.hub_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hub_settings' and policyname='anon write hub_settings') then
    create policy "anon write hub_settings"  on public.hub_settings for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hub_settings' and policyname='anon update hub_settings') then
    create policy "anon update hub_settings" on public.hub_settings for update using (true) with check (true);
  end if;
end $$;
