-- Migration: checklist_item_state
-- Version:  20261113120000
--
-- Stores changes made on a site's launch setup checklist in the Command Hub (status, a
-- blocked reason, notes, and which environment variables are marked "set").
-- The checklist itself (items, instructions, links, dependencies) lives in
-- data/checklists/<siteId>.json in the repo; this table is laid over the file.
--
-- NO SECRETS: only names and yes/no flags are stored, never values. The Hub's server
-- action refuses notes that look like keys or passwords.
--
-- NOT YET APPLIED. Run it once in the Hub's Supabase project (the one tracker_task_state is in).
-- Until then the checklist still shows, and changes made on screen are kept on that device only.
-- Written idempotently, matching tracker_task_state: the Hub is gated app-wide by proxy.ts and
-- reaches Supabase with the anon key, so anon holds read + write.

create table if not exists public.checklist_item_state (
  site_id        text        not null,
  item_id        text        not null,
  status         text        not null
                   check (status = any (array['todo','in_progress','done','blocked','not_needed'])),
  blocked_reason text        check (blocked_reason is null or char_length(blocked_reason) <= 300),
  notes          text        check (notes is null or char_length(notes) <= 1000),
  secrets_set    text[]      not null default '{}',
  updated_at     timestamptz not null default now(),
  primary key (site_id, item_id)
);

comment on table public.checklist_item_state is
  'Current state of launch checklist items changed in the Command Hub, laid over data/checklists/<siteId>.json. Never holds secret values.';

alter table public.checklist_item_state enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='checklist_item_state' and policyname='anon read checklist_item_state') then
    create policy "anon read checklist_item_state"   on public.checklist_item_state for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='checklist_item_state' and policyname='anon write checklist_item_state') then
    create policy "anon write checklist_item_state"  on public.checklist_item_state for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='checklist_item_state' and policyname='anon update checklist_item_state') then
    create policy "anon update checklist_item_state" on public.checklist_item_state for update using (true) with check (true);
  end if;
end $$;
