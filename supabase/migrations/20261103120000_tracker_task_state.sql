-- Migration: tracker_task_state
-- Version:  20261103120000
--
-- Stores status changes made on the per-site work trackers in the Command Hub.
-- The task lists themselves live in data/trackers/<siteId>.json in the repo;
-- this table only holds the current status of tasks someone has moved on, laid
-- over the file when a tracker is shown.
--
-- APPLIED to the 'The Old Oak Town' Supabase project (the one actions_log lives
-- in) by the parent session, on Didi's instruction. Do not re-apply it. If the
-- table cannot be reached, the trackers still show (from the repo files) and the
-- Hub says changes are kept on this device only.
--
-- Written idempotently, matching actions_log: the Hub is gated app-wide by
-- proxy.ts and reaches Supabase with the anon key, so anon holds read + write.

create table if not exists public.tracker_task_state (
  site_id     text        not null,
  task_id     text        not null,
  status      text        not null
                check (status = any (array['todo','in_progress','done','parked'])),
  updated_at  timestamptz not null default now(),
  primary key (site_id, task_id)
);

comment on table public.tracker_task_state is
  'Current status of per-site tracker tasks moved on in the Command Hub, laid over data/trackers/<siteId>.json.';

alter table public.tracker_task_state enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tracker_task_state' and policyname='anon read tracker_task_state') then
    create policy "anon read tracker_task_state"   on public.tracker_task_state for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tracker_task_state' and policyname='anon write tracker_task_state') then
    create policy "anon write tracker_task_state"  on public.tracker_task_state for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tracker_task_state' and policyname='anon update tracker_task_state') then
    create policy "anon update tracker_task_state" on public.tracker_task_state for update using (true) with check (true);
  end if;
end $$;
