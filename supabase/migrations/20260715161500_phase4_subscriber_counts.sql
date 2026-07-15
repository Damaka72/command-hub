-- Migration: phase4_subscriber_counts
-- Version:  20260715161500
--
-- This migration was applied directly to the live Supabase project and is
-- recorded here so the repo has a record of the schema. It is written
-- idempotently (IF NOT EXISTS / guarded ADDs) so it is safe to keep as a record
-- and will not re-apply or alter the live schema.

-- ── subscriber_counts — manual weekly subscriber logging ─────────────────────
-- One row per publication per week. Manual entry only (no Beehiiv API on the
-- free plan). The Friday view upserts on (publication, week_commencing) and
-- reads past rows for a simple week-over-week table.
create table if not exists public.subscriber_counts (
  id               bigint generated always as identity primary key,
  publication      text not null,                        -- 'the-prompt-ly' | 'the-pathway' | 'the-oak'
  week_commencing  date not null,
  subscriber_count integer,
  entered_at       timestamptz not null default now(),
  unique (publication, week_commencing)
);

-- Allowed publication values (matches the newsletters table's publication check).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriber_counts_publication_check') then
    alter table public.subscriber_counts
      add constraint subscriber_counts_publication_check
      check (publication = any (array['the-prompt-ly'::text, 'the-pathway'::text, 'the-oak'::text]));
  end if;
end $$;

-- Lookup index for the week-over-week table (rows for a publication over time).
create index if not exists subscriber_counts_pub_week_idx
  on public.subscriber_counts using btree (publication, week_commencing);

-- Access notes (recorded, not re-applied here):
--   * subscriber_counts is created without RLS; the anon and authenticated roles
--     hold full table grants (Supabase default), so the Hub (anon key) can read
--     and upsert it — the same pattern as weekly_plan, research_briefs and
--     newsletters.
