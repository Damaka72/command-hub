-- Migration: actions_log_tracker
-- Version:  20260716091308
--
-- Repo record for the central `actions_log` table (previously created directly
-- against the live project) plus the DELETE policy the Command Hub task widgets
-- need. actions_log is the single live source of truth that replaces the old
-- localStorage `tasks-${siteId}` tracker: Cowork sessions, the coordinator agent,
-- and manual dashboard entries all write here, so the Today's Focus panel and the
-- per-site / sidebar task lists stay in sync instead of drifting.
--
-- Written idempotently (guarded creates) so re-running is a no-op and keeping it
-- as a repo record is safe even though the table already exists in production.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.actions_log (
  id           uuid primary key default gen_random_uuid(),
  site_id      text check (site_id = any (array[
                 'aiviralvideoprompts','didianolue','masteryourcareerpath',
                 'oldoaktown','theconcurrentcontractor'])),
  channel      text,
  action       text not null,
  status       text not null default 'done'
                 check (status = any (array['done','in_progress','blocked'])),
  source       text not null default 'cowork_session'
                 check (source = any (array['cowork_session','manual','coordinator_agent'])),
  link         text,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.actions_log is
  'Central log of completed/in-progress actions across all five sites, replacing the localStorage-based Command Hub tracker. Written to by Cowork sessions (and manual entries) so the dashboard has a single live source of truth.';

-- Newest-first reads (task widgets, activity feed) hit created_at.
create index if not exists actions_log_created_at_idx
  on public.actions_log using btree (created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The Hub is gated app-wide by proxy.ts and reaches Supabase with the anon key,
-- so anon holds full CRUD here — matching content_library / newsletters.
alter table public.actions_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='actions_log' and policyname='anon read actions_log') then
    create policy "anon read actions_log"   on public.actions_log for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='actions_log' and policyname='anon write actions_log') then
    create policy "anon write actions_log"  on public.actions_log for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='actions_log' and policyname='anon update actions_log') then
    create policy "anon update actions_log" on public.actions_log for update using (true) with check (true);
  end if;
  -- New: lets the task widgets delete a to-do (the ✕ button) rather than only
  -- toggling it done.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='actions_log' and policyname='anon delete actions_log') then
    create policy "anon delete actions_log" on public.actions_log for delete using (true);
  end if;
end $$;
