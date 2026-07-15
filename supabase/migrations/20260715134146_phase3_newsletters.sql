-- Migration: phase3_newsletters
-- Version:  20260715134146
--
-- This migration was applied directly to the live Supabase project and is
-- recorded here so the repo has a record of the schema. It is written
-- idempotently (IF NOT EXISTS / guarded ADDs) so it is safe to keep as a record
-- and will not re-apply or alter the live schema.

-- ── newsletters — the newsletter workspace data model ────────────────────────
-- One row per publication per week. `repurposed_from` holds content_library ids
-- (which are uuid, not bigint) selected as source material in the workspace.
create table if not exists public.newsletters (
  id              bigint generated always as identity primary key,
  publication     text not null,                       -- 'the-prompt-ly' | 'the-pathway' | 'the-oak'
  week_commencing date not null,
  status          text not null default 'draft',       -- draft | finalised | sent
  subject_options jsonb,                                -- array of candidate subject lines
  draft_content   text,
  edited_content  text,
  repurposed_from uuid[],                               -- content_library ids (uuid) repurposed as source
  sent_at         timestamptz,
  unique (publication, week_commencing)
);

-- Allowed publication values.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletters_publication_check') then
    alter table public.newsletters
      add constraint newsletters_publication_check
      check (publication = any (array['the-prompt-ly'::text, 'the-pathway'::text, 'the-oak'::text]));
  end if;
end $$;

-- Allowed status values (matches the content_library status-check pattern).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletters_status_check') then
    alter table public.newsletters
      add constraint newsletters_status_check
      check (status = any (array['draft'::text, 'finalised'::text, 'sent'::text]));
  end if;
end $$;

-- Lookup index for the workspace (a publication's row for a given week).
create index if not exists newsletters_pub_week_idx
  on public.newsletters using btree (publication, week_commencing);

-- Access notes (recorded, not re-applied here):
--   * newsletters is created without RLS; the anon and authenticated roles hold
--     full table grants (Supabase default), so the Hub (anon key) can read and
--     upsert it — the same pattern as weekly_plan and research_briefs.
