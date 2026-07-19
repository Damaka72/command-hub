-- Migration: phase5_newsletter_research_brief
-- Version:  20260719160000
--
-- This migration was applied directly to the live Supabase project and is
-- recorded here so the repo has a record of the schema. It is written
-- idempotently (ADD COLUMN IF NOT EXISTS) so it is safe to keep as a record and
-- will not re-apply or alter the live schema.

-- ── newsletters.research_brief ───────────────────────────────────────────────
-- Each newsletter (publication + week) gets its OWN research brief, distinct
-- from the per-site research_briefs table (which feeds the pre-week content
-- pipeline). The newsletter brief is generated from the weekly-plan theme plus
-- the week's social highlights and best past performers, is editable in the
-- Newsletter tab, and seeds the draft generator.
alter table public.newsletters
  add column if not exists research_brief text;
